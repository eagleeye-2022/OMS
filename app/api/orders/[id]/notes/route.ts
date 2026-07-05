import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { orderNoteSchema } from '@/validations/order.schema'
import { filterNotesForRole, canWriteNoteType } from '@/lib/order-visibility'
import { NOTE_TYPE_LABEL, type NoteType } from '@/lib/constants'

// Notes are siloed by domain (general/creative/production/shipping/
// accounts) — a role only reads/writes the domain(s) it owns, per
// NOTE_TYPE_ACCESS in lib/constants.ts. Admin sees/writes every domain. The
// 'shipping' role has zero domains under the final access matrix (it owns
// no module), so every request from that role is rejected here regardless
// of noteType.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const order = await Order.findById(id).select('notes').lean()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

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
