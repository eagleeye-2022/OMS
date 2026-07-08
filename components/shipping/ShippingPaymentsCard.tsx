'use client'

import { OrderFinanceCard } from '@/components/orders/OrderFinanceCard'
import type { IOrder } from '@/types'

interface ShippingPaymentsCardProps {
  order: IOrder
  onUpdated: () => void
}

/**
 * Reuses the Orders module's finance card as-is. The 'shipping' role has
 * Shipping module access but is deliberately NOT in CAN_VIEW_FINANCE
 * (lib/order-visibility.ts) — pricing/payment data isn't needed to fulfil a
 * shipment. No extra gating is needed here: the API already strips
 * totalAmount for any role that shouldn't see it, and this card already
 * self-guards on that field (renders nothing rather than a blank card).
 */
export function ShippingPaymentsCard({ order, onUpdated }: ShippingPaymentsCardProps) {
  return <OrderFinanceCard order={order} onPaymentLogged={onUpdated} />
}
