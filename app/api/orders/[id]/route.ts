import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import Notification from '@/models/Notification'
import {
  updateDesignStatusSchema,
  updateProductionStageSchema,
  updateProductionStageProgressSchema,
  updateOrderCoreSchema,
  updateShippingDetailsSchema,
} from '@/validations/order.schema'
import { applyDirectStatusUpdate } from '@/lib/order-status'
import { stripSensitiveOrderFields, ORDER_CLIENT_DETAIL_FIELDS } from '@/lib/order-visibility'
import { PRODUCTION_STAGE_KEY_LABEL, type ProductionStage } from '@/lib/constants'

function mongoError(err: unknown): NextResponse | null {
  const e = err as { code?: number; name?: string; message?: string }
  if (e.name === 'ValidationError') {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
  if (e.code === 11000) {
    return NextResponse.json({ success: false, error: 'Duplicate key conflict' }, { status: 409 })
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const order = await Order.findById(id)
      .populate('client', ORDER_CLIENT_DETAIL_FIELDS)
      .populate('createdBy', 'name email')
      .populate('assignedTeam.salesExecutive', 'name')
      .populate('assignedTeam.creativeExecutive', 'name')
      .populate('assignedTeam.productionManager', 'name')
      .populate('deliveredBy', 'name')
      .populate('invoice.uploadedBy', 'name')
      .lean()

    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const logs = await ActivityLog.find({ order: id }).sort({ createdAt: -1 }).limit(20).lean()

    return NextResponse.json({ success: true, data: { order: stripSensitiveOrderFields(order, session.role), logs } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    await connectDB()

    const existing = await Order.findById(id)
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const { role } = session

    const respondWithUpdated = async () => {
      const updated = await Order.findById(id)
        .populate('client', ORDER_CLIENT_DETAIL_FIELDS)
        .populate('createdBy', 'name')
        .lean()
      return NextResponse.json({ success: true, data: stripSensitiveOrderFields(updated, role) })
    }

    // ── Intent: Design Status Update ─────────────────────────────────────────
    // Triggered by presence of designStatus. Allowed for: admin, creative.
    if ('designStatus' in body) {
      if (role !== 'admin' && role !== 'creative') {
        return NextResponse.json(
          { success: false, error: 'Only the creative team or admin can update design status' },
          { status: 403 }
        )
      }

      const parsed = updateDesignStatusSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }

      existing.designStatus = parsed.data.designStatus
      if (parsed.data.creativeRemarks !== undefined) existing.creativeRemarks = parsed.data.creativeRemarks
      if (parsed.data.revisionNote) {
        existing.revisionHistory.push({ note: parsed.data.revisionNote, by: session.name, at: new Date() })
      }

      // Server-side auto-advance: client_approved while in design_review → design_approved
      if (parsed.data.designStatus === 'client_approved' && existing.status === 'design_review') {
        existing.status = 'design_approved'
      }

      await existing.save()

      if (parsed.data.designStatus === 'client_approved') {
        await Promise.all([
          ActivityLog.create({
            type: 'design_approved',
            description: `Design approved for order ${existing.orderNumber}`,
            order: id,
            user: session.id,
            userName: session.name,
          }),
          Notification.create({
            type: 'design_approved',
            title: `Design approved · ${existing.orderNumber}`,
            message: `Client has approved the design for order ${existing.orderNumber}`,
            order: id,
            priority: 'medium',
          }),
        ])
      } else {
        await ActivityLog.create({
          type: 'order_updated',
          description: `Design status set to '${parsed.data.designStatus}' on ${existing.orderNumber}`,
          order: id,
          user: session.id,
          userName: session.name,
        })
      }

      return respondWithUpdated()
    }

    // ── Intent: Production Stage Update ──────────────────────────────────────
    // Triggered by presence of productionStage. Allowed for: admin, production.
    if ('productionStage' in body) {
      if (role !== 'admin' && role !== 'production') {
        return NextResponse.json(
          { success: false, error: 'Only the production team or admin can update production stage' },
          { status: 403 }
        )
      }

      const parsed = updateProductionStageSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }

      existing.productionStage = parsed.data.productionStage
      if (parsed.data.productionRemarks !== undefined) existing.productionRemarks = parsed.data.productionRemarks

      // Server-side auto-transition based on stage
      const STAGE_TO_STATUS: Partial<Record<string, string>> = {
        printing: 'in_production',
        stitching: 'in_production',
        finishing: 'in_production',
        quality_check: 'quality_check',
        completed: 'shipping_ready',
      }
      const newOrderStatus = STAGE_TO_STATUS[parsed.data.productionStage]
      if (newOrderStatus) existing.status = newOrderStatus as typeof existing.status

      await existing.save()

      await ActivityLog.create({
        type: 'production_stage_updated',
        description: `Production stage set to '${parsed.data.productionStage}' on order ${existing.orderNumber}`,
        order: id,
        user: session.id,
        userName: session.name,
      })

      return respondWithUpdated()
    }

    // ── Intent: Structured Production Stage Progress Update ──────────────────
    // Triggered by presence of `stage` (one of printing/stitching/finishing/
    // qcCheck). Allowed for: admin, production. Distinct from the legacy
    // `productionStage` intent above (a single current-stage pointer used by
    // the admin-facing generic Orders view) — this updates the structured
    // per-stage units/worker/status record the Production Queue module reads.
    if ('stage' in body) {
      if (role !== 'admin' && role !== 'production') {
        return NextResponse.json(
          { success: false, error: 'Only the production team or admin can update production progress' },
          { status: 403 }
        )
      }

      const parsed = updateProductionStageProgressSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }

      const { stage, status, unitsCompleted, totalUnits, workerName, note } = parsed.data
      const current = existing.productionStages[stage]
      if (status !== undefined) current.status = status
      if (unitsCompleted !== undefined) current.unitsCompleted = unitsCompleted
      if (totalUnits !== undefined) current.totalUnits = totalUnits
      else if (!current.totalUnits) current.totalUnits = existing.quantity
      if (workerName !== undefined) current.workerName = workerName
      if (note !== undefined) current.note = note
      current.updatedAt = new Date()
      current.updatedBy = new Types.ObjectId(session.id)

      // Keep the legacy productionStage pointer + overall order status in
      // sync so the admin's generic Orders view stays accurate, reusing the
      // exact same stage->status mapping as the legacy intent above.
      const LEGACY_STAGE_KEY: Record<string, ProductionStage> = {
        printing: 'printing', stitching: 'stitching', finishing: 'finishing', qcCheck: 'quality_check',
      }
      const STAGE_TO_STATUS: Partial<Record<string, string>> = {
        printing: 'in_production', stitching: 'in_production', finishing: 'in_production', quality_check: 'quality_check',
      }
      if (status === 'in_progress' || status === 'completed') {
        existing.productionStage = LEGACY_STAGE_KEY[stage]
        const newOrderStatus = STAGE_TO_STATUS[LEGACY_STAGE_KEY[stage]]
        if (newOrderStatus) existing.status = newOrderStatus as typeof existing.status
      }

      existing.markModified('productionStages')
      await existing.save()

      await ActivityLog.create({
        type: 'production_stage_updated',
        description: `${PRODUCTION_STAGE_KEY_LABEL[stage]} stage updated on order ${existing.orderNumber}`,
        order: id,
        user: session.id,
        userName: session.name,
      })

      return respondWithUpdated()
    }

    // ── Intent: Courier / Shipping Details Assignment ────────────────────────
    // Triggered by presence of courierPartner. Allowed for: admin, sales,
    // accounts. Auto-dispatches a 'shipping_ready' order the first time
    // courier info is saved; later calls just edit the details in place.
    if ('courierPartner' in body) {
      if (!['admin', 'sales', 'accounts'].includes(role)) {
        return NextResponse.json(
          { success: false, error: 'Only admin, sales, or accounts can assign shipping/courier details' },
          { status: 403 }
        )
      }

      const parsed = updateShippingDetailsSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }

      Object.assign(existing, parsed.data)

      const wasShippingReady = existing.status === 'shipping_ready'
      if (wasShippingReady) existing.status = 'dispatched'

      await existing.save()

      await ActivityLog.create({
        type: wasShippingReady ? 'order_dispatched' : 'order_updated',
        description: wasShippingReady
          ? `Order ${existing.orderNumber} dispatched via ${parsed.data.courierPartner}`
          : `Shipping details updated on order ${existing.orderNumber}`,
        order: id,
        user: session.id,
        userName: session.name,
      })

      return respondWithUpdated()
    }

    // ── Intent: Direct Status Update ─────────────────────────────────────────
    // Standalone status change. Shared with PATCH /api/orders/[id]/status.
    if ('status' in body) {
      const result = await applyDirectStatusUpdate(existing, session, body)
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: result.status })
      }
      return respondWithUpdated()
    }

    // ── Intent: Advance Paid Correction ──────────────────────────────────────
    // Direct advancePaid override. Restricted to admin only — normal payment
    // recording must go through POST /api/payments.
    if ('advancePaid' in body) {
      if (role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Only admin can directly adjust advance payment. Use /api/payments for normal payment recording.' },
          { status: 403 }
        )
      }

      const advance = Number(body.advancePaid)
      if (!Number.isFinite(advance) || advance < 0) {
        return NextResponse.json({ success: false, error: 'advancePaid must be a non-negative number' }, { status: 400 })
      }
      if (advance > existing.totalAmount) {
        return NextResponse.json({ success: false, error: 'advancePaid cannot exceed the order total amount' }, { status: 400 })
      }

      existing.advancePaid = advance
      existing.balanceDue = existing.totalAmount - advance
      existing.paymentStatus = advance >= existing.totalAmount ? 'paid' : advance > 0 ? 'partial' : 'pending'

      await existing.save()

      return respondWithUpdated()
    }

    // ── Intent: Core Order Details Edit ("Edit Details") ─────────────────────
    // category/productType/quantity/sizeBreakdown/deliveryDate/priority.
    // Restricted to admin and sales.
    if (['category', 'productType', 'quantity', 'sizeBreakdown', 'deliveryDate', 'priority'].some((f) => f in body)) {
      if (role !== 'admin' && role !== 'sales') {
        return NextResponse.json(
          { success: false, error: 'Only admin or sales can edit order details' },
          { status: 403 }
        )
      }

      const parsed = updateOrderCoreSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }

      Object.assign(existing, parsed.data)
      await existing.save()

      await ActivityLog.create({
        type: 'order_updated',
        description: `Order details updated for ${existing.orderNumber}`,
        order: id,
        user: session.id,
        userName: session.name,
      })

      return respondWithUpdated()
    }

    // ── No recognized intent ──────────────────────────────────────────────────
    return NextResponse.json(
      { success: false, error: 'Request body contains no recognized update fields' },
      { status: 400 }
    )
  } catch (err) {
    const safe = mongoError(err)
    if (safe) return safe
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    await connectDB()
    await Order.findByIdAndUpdate(id, { status: 'cancelled' })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
