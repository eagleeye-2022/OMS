import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import Client from '@/models/Client'
import ActivityLog from '@/models/ActivityLog'
import { orderSchema } from '@/validations/order.schema'
import { stripSensitiveOrderFields, applyOwnQueueVisibility } from '@/lib/order-visibility'
import { getDispatchBlockReason } from '@/lib/order-status'
import { ORDER_STAGE_STATUSES, SHIPPING_RELEVANT_STATUSES } from '@/lib/constants'

function mongoError(err: unknown): NextResponse | null {
  const e = err as { code?: number; name?: string; message?: string }
  if (e.code === 11000) {
    return NextResponse.json(
      { success: false, error: 'Order number collision — please retry' },
      { status: 409 }
    )
  }
  if (e.name === 'ValidationError') {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const stage = searchParams.get('stage') || ''
    const relevantTo = searchParams.get('relevantTo') || ''
    const assignedToMe = searchParams.get('assignedToMe') === 'true'
    const view = searchParams.get('view') || ''
    // Excludes cancelled orders from the result set — the query-layer
    // equivalent of the same `status: { $ne: 'cancelled' }` rule already
    // used by app/api/accounts/summary/route.ts, so any list consumer that
    // shouldn't show phantom receivables/invoices for a dead deal (Accounts'
    // Due Payments / All Invoices / Record Payment order-picker) can opt in
    // here instead of each re-implementing (or forgetting) its own filter.
    // Deliberately narrower than CLOSED_ORDER_STATUSES — a delivered order
    // with a real unpaid balance is still a legitimate receivable.
    const excludeCancelled = searchParams.get('excludeCancelled') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {}
    if (status) query.status = status
    if (excludeCancelled) query.status = { $ne: 'cancelled' }
    if (stage && stage in ORDER_STAGE_STATUSES) {
      query.status = { $in: ORDER_STAGE_STATUSES[stage as keyof typeof ORDER_STAGE_STATUSES] }
    }
    // Orders where design work is still relevant: not yet handed off to
    // production. Used by the Creative board so completed/shipped orders
    // don't linger there.
    if (relevantTo === 'creative') {
      query.status = { $in: ['pending', 'design_review', 'design_approved'] }
    }
    // Orders ready for or currently in production: design approved through
    // QC, not yet handed to shipping. Used by the Production queue. Includes
    // 'delayed' (on hold) — an order paused mid-production must stay visible
    // to Production with a clear "On Hold" state, not silently disappear
    // from the queue (mirrors Shipping's relevantTo filter below).
    if (relevantTo === 'production') {
      query.status = { $in: ['design_approved', 'in_production', 'quality_check', 'delayed'] }
    }
    // Orders handed off to Shipping through terminal delivery. 'delivered' is
    // included (rather than excluded like Creative/Production's completed
    // state) so the Shipping queue's "Delivered" summary card has data.
    if (relevantTo === 'shipping') {
      query.status = { $in: SHIPPING_RELEVANT_STATUSES }
    }
    if (assignedToMe) {
      if (session.role === 'production') {
        query['assignedTeam.productionManager'] = session.id
      } else {
        query['assignedTeam.creativeExecutive'] = session.id
      }
    }
    // Creative users' default queue is their own assigned tasks only — the
    // server enforces this independent of `assignedToMe` (which the block
    // above still honors as an explicit admin/manager filter) so it can't be
    // bypassed by omitting or forging a client-side param. `view=unassigned`
    // opts into the separate self-serve pickup bucket instead of "mine";
    // admin/managers may also pass it, but are never restricted by default.
    if (relevantTo === 'creative') {
      applyOwnQueueVisibility(query, session, {
        restrictedRoles: ['creative'],
        assignmentField: 'assignedTeam.creativeExecutive',
        view,
        unassignedViewRoles: ['creative', 'admin'],
      })
    }
    // Production users' default queue ("My Queue") is their own assigned
    // tasks; `view=all` broadens that to every *assigned* production order
    // (teammates' batches included) but still excludes unassigned ones —
    // unlike Creative, there is no self-serve "Unassigned" pickup bucket for
    // Production at all: `unassignedViewRoles: ['admin']` means a Production
    // session forging `view=unassigned` still falls through to the "my
    // assigned tasks" restriction instead of seeing unassigned work.
    if (relevantTo === 'production') {
      applyOwnQueueVisibility(query, session, {
        restrictedRoles: ['production'],
        assignmentField: 'assignedTeam.productionManager',
        view,
        unassignedViewRoles: ['admin'],
        allAssignedViewRoles: ['production'],
      })
    }
    if (search) {
      // Client is a reference, so a plain regex on Order can't reach the
      // company name the search bars advertise matching — look up matching
      // client ids first and fold them into the same $or.
      const matchingClients = await Client.find({ companyName: { $regex: search, $options: 'i' } }).select('_id').lean()
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { productType: { $regex: search, $options: 'i' } },
        { client: { $in: matchingClients.map((c) => c._id) } },
      ]
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        // Nearest deadline first (deliveryDate is a required field, so there's
        // no "no deadline" case here) — overdue orders naturally sort first
        // too, since their date is further in the past. orderNumber is a
        // stable, unique tiebreaker for orders sharing the same deliveryDate.
        .sort({ deliveryDate: 1, orderNumber: 1 })
        .skip(skip)
        .limit(limit)
        .populate('client', 'companyName')
        .populate('createdBy', 'name')
        .populate('assignedTeam.creativeExecutive', 'name')
        .populate('assignedTeam.productionManager', 'name')
        .populate('deliveredBy', 'name')
        .lean(),
      Order.countDocuments(query),
    ])

    // Computed from the raw (pre-strip) doc so it still reflects real
    // paymentStatus even for roles (e.g. 'shipping') that never receive that
    // field themselves — see getDispatchBlockReason's doc comment.
    const data = orders.map((o) => ({
      ...stripSensitiveOrderFields(o, session.role),
      dispatchBlockedReason: getDispatchBlockReason(o),
    }))

    return NextResponse.json({ success: true, data, total, page, limit })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'sales'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only sales or admin can create orders' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()

    // Sort by orderNumber's own numeric value (not createdAt) — mirrors
    // Client.clientCode's proven generation in models/Client.ts. Seed data's
    // order numbers are NOT monotonic with createdAt (e.g. ORD-2044 has an
    // older createdAt than ORD-2041), so "most recent by date, then +1" can
    // and did land back on an already-taken number and 500 on every
    // subsequent attempt once that collision occurred.
    const lastOrder = await Order.findOne({ orderNumber: { $exists: true } })
      .collation({ locale: 'en_US', numericOrdering: true })
      .sort({ orderNumber: -1 })
      .select('orderNumber')
      .lean()
    let nextNum = 2000
    if (lastOrder && lastOrder.orderNumber) {
      const match = lastOrder.orderNumber.match(/\d+/)
      if (match) nextNum = parseInt(match[0]) + 1
    }
    const orderNumber = `ORD-${nextNum}`

    const { advancePaid = 0, totalAmount } = parsed.data
    const balanceDue = totalAmount - advancePaid
    const paymentStatus = advancePaid >= totalAmount ? 'paid' : advancePaid > 0 ? 'partial' : 'pending'

    const order = await Order.create({
      ...parsed.data,
      orderNumber,
      balanceDue,
      paymentStatus,
      status: 'pending',
      designStatus: 'pending',
      createdBy: session.id,
    })

    await ActivityLog.create({
      type: 'order_created',
      description: `Order ${orderNumber} created`,
      order: order._id,
      client: parsed.data.client,
      user: session.id,
      userName: session.name,
    })

    const populated = await order.populate('client', 'companyName')
    return NextResponse.json({ success: true, data: populated }, { status: 201 })
  } catch (err) {
    const safe = mongoError(err)
    if (safe) return safe
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
