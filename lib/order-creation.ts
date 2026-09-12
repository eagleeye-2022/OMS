import Order, { type IOrderDocument } from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
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
  let nextNum = 1
  if (lastOrder && lastOrder.orderNumber) {
    const match = lastOrder.orderNumber.match(/\d+/)
    if (match) nextNum = parseInt(match[0]) + 1
  }
  return `ORD-${nextNum}`
}

/** Derives balanceDue/paymentStatus from totalAmount/advancePaid — the same rule everywhere an order's money fields are set at creation time. */
export function computeOrderMoney(totalAmount: number, advancePaid: number): { balanceDue: number; paymentStatus: PaymentStatus } {
  const balanceDue = totalAmount - advancePaid
  // totalAmount > 0 guards against a zero-amount order (e.g. converted from
  // a lead with no amount entered) being mislabeled "Fully Paid" just
  // because 0 >= 0 — there's nothing paid, so it should read as pending.
  const paymentStatus: PaymentStatus = totalAmount > 0 && advancePaid >= totalAmount ? 'paid' : advancePaid > 0 ? 'partial' : 'pending'
  return { balanceDue, paymentStatus }
}

export interface PreferenceOrderInput {
  // Optional here (rather than mirroring the strict clientSchema shape)
  // because callers pass parsed.data from a `isFinal ? clientSchema :
  // clientDraftSchema` ternary, which TypeScript can't narrow to the strict
  // branch across the ternary — the draft schema's looser, all-optional
  // shape wins in the static type. Rows missing any of these are simply
  // skipped below; the caller only ever reaches this function with
  // genuinely-required fields at runtime because it's gated on isFinal.
  preferredProductCategory?: string
  orderQuantity?: number
  orderNote?: string
  totalAmount?: number
  advancePaid?: number
  /** Already-linked Order id (as a string or ObjectId, depending on caller) — presence means "skip, already a real order". */
  orderId?: { toString(): string } | string
}

/**
 * Converts each product-preference row that carries pricing (totalAmount >
 * 0) and hasn't already produced an Order (no `orderId` yet) into a real
 * Order, then stamps `orderId` onto the row in place so re-saving the
 * client later (e.g. editing to add one more row) never creates a
 * duplicate for a row that's already a real order.
 *
 * Used by both client creation (POST /api/clients) and later edits
 * (PUT /api/clients/[id]) — previously this only ran at creation time, so a
 * preference row added while editing an already-active client silently
 * never became a real Order: visible in the client's own "Order
 * Preferences" summary, but never in Order History or the Orders module.
 */
export async function materializeOrderPreferences(
  clientId: string,
  deliveryDate: string | undefined,
  productPreferences: PreferenceOrderInput[],
  createdBy: { id: string; name: string }
): Promise<IOrderDocument[]> {
  if (!deliveryDate) return []
  const createdOrders: IOrderDocument[] = []

  for (const pref of productPreferences) {
    if (pref.orderId) continue
    if (!pref.totalAmount || pref.totalAmount <= 0) continue
    if (!pref.preferredProductCategory || !pref.orderQuantity || !pref.orderNote) continue

    const orderNumber = await getNextOrderNumber()
    const advancePaid = pref.advancePaid || 0
    const { balanceDue, paymentStatus } = computeOrderMoney(pref.totalAmount, advancePaid)

    const order = await Order.create({
      orderNumber,
      client: clientId,
      category: pref.preferredProductCategory,
      productType: pref.orderNote,
      quantity: pref.orderQuantity,
      deliveryDate,
      totalAmount: pref.totalAmount,
      advancePaid,
      balanceDue,
      paymentStatus,
      status: 'pending',
      designStatus: 'pending',
      createdBy: createdBy.id,
    })

    await ActivityLog.create({
      type: 'order_created',
      description: `Order ${orderNumber} created`,
      order: order._id,
      client: clientId,
      user: createdBy.id,
      userName: createdBy.name,
    })

    pref.orderId = order._id.toString()
    createdOrders.push(order)
  }

  return createdOrders
}
