import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { orderNoteSchema } from '@/validations/order.schema'
import { filterNotesForRole, canWriteNoteType, canViewOrderDetail } from '@/lib/order-visibility'
import { NOTE_TYPE_LABEL, type NoteType } from '@/lib/constants'

// Notes are siloed by domain (general/creative/production/shipping/
// accounts) — a role only reads/writes the domain(s) it owns, per
// NOTE_TYPE_ACCESS in lib/constants.ts. Admin sees/writes every domain.
// 'operations' (the merged production+shipping role) only owns the
// 'production' note domain — it inherited that from the old 'production'
// role; the old 'shipping' role had zero note domains, so operations still
// can't read/write 'shipping'-domain notes despite having the Shipping
// module in its UI.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const order = await Order.findById(id).select('notes assignedTeam').lean()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (!canViewOrderDetail(order, session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this order' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: filterNotesForRole(order.notes, session.role) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = orderNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const noteType: NoteType = parsed.data.noteType || 'general'
    if (!canWriteNoteType(session.role, noteType)) {
      return NextResponse.json(
        { success: false, error: `Role '${session.role}' cannot post ${NOTE_TYPE_LABEL[noteType]} notes` },
        { status: 403 }
      )
    }

    await connectDB()

    // A creative/production user must at least be able to *see* this order
    // before adding a note to it — otherwise they could blindly write to an
    // order they can't view (e.g. production writing a "production" note on
    // an order still stuck at pending/design_review, which they'd be blocked
    // from even opening). Notes stay collaborative among everyone who can
    // see the order; this only closes the "acting on what you can't see" gap.
    const existing = await Order.findById(id).select('assignedTeam').lean()
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (!canViewOrderDetail(existing, session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this order' }, { status: 403 })
    }

    const note = { text: parsed.data.text, authorId: session.id, authorName: session.name, at: new Date(), noteType }
    const order = await Order.findByIdAndUpdate(id, { $push: { notes: note } }, { new: true }).select('notes orderNumber').lean()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    await ActivityLog.create({
      type: 'note_added',
      description: `${NOTE_TYPE_LABEL[noteType]} note added to order ${order.orderNumber}`,
      order: id,
      user: session.id,
      userName: session.name,
    })

    return NextResponse.json({ success: true, data: filterNotesForRole(order.notes, session.role) }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
