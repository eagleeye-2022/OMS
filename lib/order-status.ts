import ActivityLog from '@/models/ActivityLog'
import Notification from '@/models/Notification'
import type { IOrderDocument } from '@/models/Order'
import type { SessionUser } from './auth'
import type { Role, OrderStatus } from './constants'
import { updateOrderStatusSchema } from '@/validations/order.schema'

// Which order statuses each role may set via the direct status-update path
// (PUT's `status` intent and PATCH /api/orders/[id]/status). Creative and
// production drive status through their own intent paths (designStatus /
// productionStage) instead — the server handles those auto-transitions.
// 'dispatched' and 'delivered' are deliberately excluded from every role
// (including admin) — they may only be reached via the courier-assign PUT
// intent and the dedicated mark-delivered route respectively, so the
// data those transitions require (courier info; deliveredAt/deliveredBy)
// can never be bypassed by a bare status update.
export const ROLE_ALLOWED_STATUSES: Record<Role, OrderStatus[]> = {
  admin: [
    'pending', 'design_review', 'design_approved', 'in_production',
    'quality_check', 'shipping_ready', 'in_transit', 'cancelled', 'delayed',
  ],
  sales: ['design_review', 'cancelled', 'in_transit', 'delayed'],
  creative: [],
  production: [],
  shipping: [],
  accounts: ['in_transit', 'delayed'],
}

export type StatusUpdateResult = { ok: true } | { ok: false; status: number; error: string }

/**
 * Shared by PUT /api/orders/[id]'s `status` intent and the dedicated
 * PATCH /api/orders/[id]/status route, so the role-gated transition logic
 * only lives in one place.
 */
export async function applyDirectStatusUpdate(
  existing: IOrderDocument,
  session: SessionUser,
  body: unknown
): Promise<StatusUpdateResult> {
  const allowedStatuses = ROLE_ALLOWED_STATUSES[session.role] ?? []
  if (allowedStatuses.length === 0) {
    return { ok: false, status: 403, error: `Role '${session.role}' cannot update order status directly` }
  }

  const parsed = updateOrderStatusSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0].message }
  }

  if (!allowedStatuses.includes(parsed.data.status)) {
    return { ok: false, status: 403, error: `Role '${session.role}' cannot set status to '${parsed.data.status}'` }
  }

  const prevStatus = existing.status
  existing.status = parsed.data.status
  if (parsed.data.revisionNote) {
    existing.revisionHistory.push({ note: parsed.data.revisionNote, by: session.name, at: new Date() })
  }
  if (parsed.data.status === 'delayed') {
    existing.delayReason = parsed.data.delayReason
  } else if (prevStatus === 'delayed') {
    existing.delayReason = undefined
  }

  await existing.save()

  if (parsed.data.status !== prevStatus) {
    const tasks: Promise<unknown>[] = [
      ActivityLog.create({
        type: 'status_changed',
        description: `Order ${existing.orderNumber} moved to '${parsed.data.status}'`,
        order: existing._id,
        user: session.id,
        userName: session.name,
      }),
    ]

    if (parsed.data.status === 'delayed') {
      tasks.push(
        Notification.create({
          type: 'order_overdue',
          title: `${existing.orderNumber} is delayed`,
          message: `Order ${existing.orderNumber} has been marked as delayed`,
          order: existing._id,
          priority: 'critical',
        })
      )
    }

    await Promise.all(tasks)
  }

  return { ok: true }
}
