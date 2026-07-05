import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { stripSensitiveOrderFields, ORDER_CLIENT_DETAIL_FIELDS } from '@/lib/order-visibility'

const DELIVERABLE_STATUSES = ['dispatched', 'in_transit', 'delayed']

/**
 * Explicit, auditable "Mark as Delivered" action — admin only, per the
 * Shipping module's hard requirement. Deliberately a dedicated endpoint
 * rather than folded into the generic status PUT intent (which excludes
 * 'delivered' from every role's allowed list) so deliveredAt/deliveredBy
 * can never be bypassed, mirroring production-complete/route.ts's shape.
 */
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admin can mark an order as delivered' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()

    const existing = await Order.findById(id)
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (!DELIVERABLE_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { success: false, error: `Order must be dispatched, in transit, or delayed before it can be marked delivered (current status: '${existing.status}')` },
        { status: 400 }
      )
    }

    existing.status = 'delivered'
    existing.deliveredAt = new Date()
    existing.deliveredBy = new Types.ObjectId(session.id)
    existing.delayReason = undefined
    await existing.save()

    await ActivityLog.create({
      type: 'order_delivered',
      description: `Order ${existing.orderNumber} marked as delivered`,
      order: id,
      user: session.id,
      userName: session.name,
    })

    const updated = await Order.findById(id)
      .populate('client', ORDER_CLIENT_DETAIL_FIELDS)
      .populate('createdBy', 'name')
      .populate('deliveredBy', 'name')
      .lean()

    return NextResponse.json({ success: true, data: stripSensitiveOrderFields(updated, session.role) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
