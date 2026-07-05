import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { PRODUCTION_STAGE_KEYS } from '@/lib/constants'
import { stripSensitiveOrderFields, ORDER_CLIENT_DETAIL_FIELDS } from '@/lib/order-visibility'

// Statuses production-complete may still fire from. Anything else means the
// order has already moved past production once (shipping_ready and beyond)
// or is off the normal path (cancelled) — re-running the action from one of
// those must never regress status, courier/dispatch progress, or paid
// invoice state back to 'shipping_ready'.
const PRE_COMPLETION_STATUSES = ['pending', 'design_review', 'design_approved', 'in_production', 'quality_check', 'delayed']

/**
 * Explicit, auditable "Mark Production Complete" action. Deliberately a
 * dedicated endpoint rather than folded into the generic PUT intent router —
 * this is a one-way workflow transition (hands the order to Shipping), so it
 * gets its own server-side re-validation instead of trusting the client's
 * checklist state.
 */
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'production'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only the production team or admin can complete production' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()

    const existing = await Order.findById(id)
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    if (!PRE_COMPLETION_STATUSES.includes(existing.status)) {
      await ActivityLog.create({
        type: 'production_complete_rejected',
        description: `Rejected duplicate "Mark Production Complete" on order ${existing.orderNumber} — already at '${existing.status}'`,
        order: id,
        user: session.id,
        userName: session.name,
      })
      return NextResponse.json(
        {
          success: false,
          error: `Production has already been completed for this order (current status: '${existing.status}'). This action cannot be re-applied once the order has moved on to shipping.`,
        },
        { status: 409 }
      )
    }

    const incompleteStage = PRODUCTION_STAGE_KEYS.find((key) => existing.productionStages[key].status !== 'completed')
    if (incompleteStage) {
      return NextResponse.json(
        { success: false, error: `All production stages must be completed first (${incompleteStage} is not done)` },
        { status: 400 }
      )
    }

    existing.productionCompletedAt = new Date()
    existing.productionCompletedBy = new Types.ObjectId(session.id)
    existing.productionStage = 'completed'
    existing.status = 'shipping_ready'
    await existing.save()

    await ActivityLog.create({
      type: 'production_completed',
      description: `Production completed for order ${existing.orderNumber} — ready for shipping`,
      order: id,
      user: session.id,
      userName: session.name,
    })

    const updated = await Order.findById(id)
      .populate('client', ORDER_CLIENT_DETAIL_FIELDS)
      .populate('createdBy', 'name')
      .lean()

    return NextResponse.json({ success: true, data: stripSensitiveOrderFields(updated, session.role) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
