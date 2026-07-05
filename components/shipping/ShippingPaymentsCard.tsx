'use client'

import { OrderFinanceCard } from '@/components/orders/OrderFinanceCard'
import type { IOrder } from '@/types'

interface ShippingPaymentsCardProps {
  order: IOrder
  onUpdated: () => void
}

/**
 * Reuses the Orders module's finance card as-is. CAN_VIEW_FINANCE
 * (lib/order-visibility.ts) already includes exactly the 3 roles that get
 * Shipping module access (admin/sales/accounts), so no extra gating is
 * needed here — the API already strips totalAmount for any role that
 * shouldn't see it, and this card already self-guards on that field.
 */
export function ShippingPaymentsCard({ order, onUpdated }: ShippingPaymentsCardProps) {
  return <OrderFinanceCard order={order} onPaymentLogged={onUpdated} />
}
