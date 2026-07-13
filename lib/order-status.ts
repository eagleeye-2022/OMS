import ActivityLog from '@/models/ActivityLog'
import Notification from '@/models/Notification'
import type { IOrderDocument } from '@/models/Order'
import type { SessionUser } from './auth'
import type { Role, OrderStatus, PaymentStatus } from './constants'
import { updateOrderStatusSchema } from '@/validations/order.schema'

/**
 * Dispatch must be blocked until the full order amount is received —
 * Accounts is the gatekeeper for shipment readiness, and Shipping must never
 * be able to act before that's confirmed. `paymentStatus === 'paid'` is set
 * by the existing payment-recording flow (POST /api/payments recomputes it
 * from advancePaid/totalAmount every time Accounts records a payment — see
 * RecordPaymentForm) the moment the balance reaches zero; that's the single
 * source of truth reused here, not a new/duplicate "cleared" concept.
 *
 * Previously this only fired when an unpaid order was *also* overdue (a
 * narrower rule from an earlier iteration of this same requirement). The
 * business rule has since been broadened to "no dispatch until payment is
 * fully cleared, full stop" — overdue is no longer part of the condition,
 * though it's still shown separately in the UI as its own indicator.
 *
 * Single source of truth for both the write-path guard (the courierPartner
 * intent in app/api/orders/[id]/route.ts) and the read-path derived
 * `dispatchBlockedReason` field so the 'shipping' role — which never
 * receives raw paymentStatus (see CAN_VIEW_FINANCE) — can still know
 * *whether* dispatch is blocked without needing financial visibility.
 */
export function getDispatchBlockReason(order: { paymentStatus: PaymentStatus }): string | null {
  if (order.paymentStatus === 'paid') return null
  return 'Full payment is not cleared. Dispatch is blocked.'
}

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
