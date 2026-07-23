import Order from '@/models/Order'
import type { PaymentStatus } from './constants'

/**
 * Shared by every path that creates an Order (POST /api/orders, and the
 * client-wizard's first-order creation in POST /api/clients) so order
 * number generation can't drift between them. Sorts by orderNumber's own
 * numeric value (not createdAt) — mirrors Client.clientCode's proven
 * generation in models/Client.ts. Seed data's order numbers are NOT
 * monotonic with createdAt, so "most recent by date, then +1" can and did
 * land back on an already-taken number.
 */
export async function getNextOrderNumber(): Promise<string> {
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
  return `ORD-${nextNum}`
}

/** Derives balanceDue/paymentStatus from totalAmount/advancePaid — the same rule everywhere an order's money fields are set at creation time. */
export function computeOrderMoney(totalAmount: number, advancePaid: number): { balanceDue: number; paymentStatus: PaymentStatus } {
  const balanceDue = totalAmount - advancePaid
  const paymentStatus: PaymentStatus = advancePaid >= totalAmount ? 'paid' : advancePaid > 0 ? 'partial' : 'pending'
  return { balanceDue, paymentStatus }
}
