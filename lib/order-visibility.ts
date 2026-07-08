import { NOTE_TYPE_ACCESS, type Role, type NoteType } from './constants'

const FINANCE_FIELDS = ['totalAmount', 'advancePaid', 'balanceDue', 'paymentStatus', 'invoice'] as const

export const CAN_VIEW_FINANCE: Role[] = ['admin', 'sales', 'accounts']

// Shipping/courier/delivery fields — operationally sensitive in the same way
// finance fields are, but distinct from them (a role can legitimately see
// one without the other). Kept as its own list even though it currently
// matches CAN_VIEW_FINANCE exactly, so the two policies can diverge later
// without becoming entangled.
const SHIPPING_FIELDS = [
  'courierPartner', 'trackingNumber', 'dispatchDate', 'expectedDeliveryDate',
  'shipmentWeight', 'packageCount', 'deliveredAt', 'deliveredBy', 'delayReason',
] as const

export const CAN_VIEW_SHIPPING: Role[] = ['admin', 'sales', 'accounts', 'shipping']

// Mongoose populate() projection for the order's embedded client — used by
// every order-detail route (GET/PUT /api/orders/[id], mark-delivered,
// production-complete, invoice, status) so the Shipping delivery-address
// card and the Accounts invoice "Bill To" block actually have data to
// render, instead of always seeing an object with only companyName/email/
// phone. List/summary routes (GET /api/orders, dashboard, activity log,
// notifications, payments) intentionally keep the narrower 'companyName'
// projection — they never render an address or GST block.
export const ORDER_CLIENT_DETAIL_FIELDS =
  'companyName email phone contactPersonName designation billingAddress shippingAddress sameAsBilling gstNumber invoiceRecipientName invoiceEmail'

// Client sub-fields that carry address/GST/billing detail — only meaningful
// to the roles that actually ship or bill the order. Stripped from the
// embedded client object for every other role, mirroring FINANCE_FIELDS/
// SHIPPING_FIELDS above so the same role can't get this data just because
// the API happens to populate it for someone else's request.
const CLIENT_DETAIL_FIELDS = [
  'contactPersonName', 'designation', 'billingAddress', 'shippingAddress',
  'sameAsBilling', 'gstNumber', 'invoiceRecipientName', 'invoiceEmail',
] as const

// Includes 'shipping' — the delivery address lives on the embedded client
// object, and a shipping operator needs it to actually ship anything.
export const CAN_VIEW_CLIENT_DETAILS: Role[] = ['admin', 'sales', 'accounts', 'shipping']

/**
 * Filters an order's notes array down to only the domains a role may see.
 * Notes without a noteType (pre-migration data) are treated as 'general' so
 * nothing silently disappears for roles that can see general notes.
 */
export function filterNotesForRole<T extends { noteType?: string }>(notes: T[], role: Role): T[] {
  const allowed = NOTE_TYPE_ACCESS[role] ?? []
  return notes.filter((note) => allowed.includes((note.noteType || 'general') as NoteType))
}

/** Whether a role may create a note tagged with the given domain. */
export function canWriteNoteType(role: Role, noteType: NoteType): boolean {
  return (NOTE_TYPE_ACCESS[role] ?? []).includes(noteType)
}

/**
 * Strips finance and shipping/courier fields from an order object entirely
 * (delete, not null-out) based on the viewing role, so restricted roles
 * (Creative/Production) never see pricing/payment or dispatch/delivery data
 * in the JSON response, not just in the UI. Also filters the embedded notes array
 * down to the domains the role may see, since notes travel with the order
 * document on every one of these responses. Replaces the narrower
 * stripFinanceFields — every call site now gets shipping-field and
 * note-domain protection for free.
 */
export function stripSensitiveOrderFields<T extends Record<string, unknown>>(order: T, role: Role): T {
  let clone = order
  if (!CAN_VIEW_FINANCE.includes(role)) {
    clone = { ...clone }
    for (const field of FINANCE_FIELDS) delete clone[field]
  }
  if (!CAN_VIEW_SHIPPING.includes(role)) {
    clone = { ...clone }
    for (const field of SHIPPING_FIELDS) delete clone[field]
  }
  if (!CAN_VIEW_CLIENT_DETAILS.includes(role) && clone.client && typeof clone.client === 'object') {
    const clientClone = { ...(clone.client as Record<string, unknown>) }
    for (const field of CLIENT_DETAIL_FIELDS) delete clientClone[field]
    clone = { ...clone, client: clientClone }
  }
  if (Array.isArray(clone.notes)) {
    clone = { ...clone, notes: filterNotesForRole(clone.notes as { noteType?: string }[], role) }
  }
  return clone
}
