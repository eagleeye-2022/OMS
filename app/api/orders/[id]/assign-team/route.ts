import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import User from '@/models/User'
import ActivityLog from '@/models/ActivityLog'
import { assignTeamSchema } from '@/validations/order.schema'

/**
 * Lightweight, purpose-built list of assignable team members per role —
 * intentionally separate from the admin-only GET /api/users (full user
 * management) so Sales can populate the assignment dropdowns without that
 * broader access.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'sales'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only sales or admin can view team assignment options' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()

    const [order, salesUsers, creativeUsers, productionUsers] = await Promise.all([
      Order.findById(id)
        .populate('assignedTeam.salesExecutive', 'name')
        .populate('assignedTeam.creativeExecutive', 'name')
        .populate('assignedTeam.productionManager', 'name')
        .select('assignedTeam')
        .lean(),
      User.find({ role: 'sales', isActive: true }).select('name role').lean(),
      User.find({ role: 'creative', isActive: true }).select('name role').lean(),
      User.find({ role: 'production', isActive: true }).select('name role').lean(),
    ])
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: {
        current: order.assignedTeam,
        options: { sales: salesUsers, creative: creativeUsers, production: productionUsers },
      },
    })
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
    const parsed = assignTeamSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const isPrivileged = ['admin', 'sales'].includes(session.role)
    // A creative user may claim an unassigned task for themselves from the
    // Unassigned queue — narrower than the admin/sales reassignment above:
    // only their own id, only the creativeExecutive slot, nothing else in
    // the same request. The "was actually unassigned" check happens
    // atomically in the update filter below so two creatives can't race
    // onto the same task.
    const isSelfClaim =
      session.role === 'creative' &&
      parsed.data.creativeExecutive === session.id &&
      parsed.data.salesExecutive === undefined &&
      parsed.data.productionManager === undefined
    if (!isPrivileged && !isSelfClaim) {
      return NextResponse.json(
        { success: false, error: 'Only sales, admin, or a creative user claiming their own unassigned task can assign the order team' },
        { status: 403 }
      )
    }

    await connectDB()

    // A cleared slot (empty string, meaning "Unassigned" chosen in the
    // dropdown) must go through $unset, not $set — Mongoose silently drops
    // undefined-valued keys from a $set, so `{ $set: { '...': undefined } }`
    // used to be a no-op that still returned 200, leaving the field assigned
    // forever with no way to actually clear it back to Unassigned.
    const setFields: Record<string, string> = {}
    const unsetFields: Record<string, ''> = {}
    const assign = (field: string, value: string | undefined) => {
      if (value === undefined) return
      if (value) setFields[field] = value
      else unsetFields[field] = ''
    }
    assign('assignedTeam.salesExecutive', parsed.data.salesExecutive)
    assign('assignedTeam.creativeExecutive', parsed.data.creativeExecutive)
    assign('assignedTeam.productionManager', parsed.data.productionManager)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { _id: id }
    if (isSelfClaim) filter['assignedTeam.creativeExecutive'] = { $exists: false }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: Record<string, any> = {}
    if (Object.keys(setFields).length) updateOp.$set = setFields
    if (Object.keys(unsetFields).length) updateOp.$unset = unsetFields

    const order = await Order.findOneAndUpdate(filter, updateOp, { new: true })
      .populate('assignedTeam.salesExecutive', 'name')
      .populate('assignedTeam.creativeExecutive', 'name')
      .populate('assignedTeam.productionManager', 'name')
      .select('assignedTeam orderNumber')
      .lean()
    if (!order) {
      if (isSelfClaim) {
        return NextResponse.json({ success: false, error: 'This task has already been claimed by someone else' }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    await ActivityLog.create({
      type: 'team_assigned',
      description: `Team assignment updated for order ${order.orderNumber}`,
      order: id,
      user: session.id,
      userName: session.name,
    })

    return NextResponse.json({ success: true, data: order.assignedTeam })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
