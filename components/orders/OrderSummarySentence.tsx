'use client'

import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, PAYMENT_STATUS_COLOR } from '@/lib/constants'
import type { IOrder, OrderStatus, PaymentStatus } from '@/types'

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Payment Pending',
  partial: 'Partially Paid',
  paid: 'Fully Paid',
  overdue: 'Payment Overdue',
}

/**
 * The one-line "story" of the order — read this instead of a field grid.
 * Reused at the top of every module's order-detail view (Orders, Creative,
 * Production, Shipping) so the description is worded identically everywhere.
 * Money clauses are included only when `order.totalAmount` is present on the
 * object — the server already strips finance fields for roles outside
 * CAN_VIEW_FINANCE (see lib/order-visibility.ts), so checking field presence
 * here is the same zero-trust pattern OrderFinanceCard already uses, not a
 * second, separately-maintained permission check.
 */
export function OrderSummarySentence({ order }: { order: IOrder }) {
  const canViewFinance = order.totalAmount != null
  const unit = order.quantity === 1 ? 'pc' : 'pcs'

  const sentence = canViewFinance
    ? `${order.category} – ${order.quantity.toLocaleString()} ${unit}, Total ${formatCurrency(order.totalAmount!)}, Advance ${formatCurrency(order.advancePaid ?? 0)} received, Balance ${formatCurrency(order.balanceDue ?? 0)}, Status: ${ORDER_STATUS_LABEL[order.status as OrderStatus]}, Delivery by ${formatDate(order.deliveryDate)}.`
    : `${order.category} – ${order.quantity.toLocaleString()} ${unit}, Status: ${ORDER_STATUS_LABEL[order.status as OrderStatus]}, Delivery by ${formatDate(order.deliveryDate)}.`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge label={ORDER_STATUS_LABEL[order.status as OrderStatus]} className={ORDER_STATUS_COLOR[order.status as OrderStatus]} />
        {canViewFinance && order.paymentStatus && (
          <Badge label={PAYMENT_STATUS_LABEL[order.paymentStatus as PaymentStatus]} className={PAYMENT_STATUS_COLOR[order.paymentStatus as PaymentStatus]} />
        )}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{sentence}</p>
    </div>
  )
}
