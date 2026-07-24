import type { SessionUser } from './auth'
import { NOTE_TYPE_ACCESS, SHIPPING_RELEVANT_STATUSES, type Role, type NoteType, type OrderStatus } from './constants'

const FINANCE_FIELDS = ['totalAmount', 'advancePaid', 'balanceDue', 'paymentStatus', 'invoice'] as const

export const CAN_VIEW_FINANCE: Role[] = ['admin', 'sales', 'accounting']

// Shipping/courier/delivery fields — operationally sensitive in the same way
// finance fields are, but distinct from them (a role can legitimately see
// one without the other). Kept as its own list even though it currently
// matches CAN_VIEW_FINANCE exactly, so the two policies can diverge later
// without becoming entangled.
const SHIPPING_FIELDS = [
  'courierPartner', 'trackingNumber', 'dispatchDate', 'expectedDeliveryDate',
  'shipmentWeight', 'packageCount', 'deliveredAt', 'deliveredBy', 'delayReason',
] as const

export const CAN_VIEW_SHIPPING: Role[] = ['admin', 'sales', 'accounting', 'operations']

// Mongoose populate() projection for the order's embedded client — used by
// every order-detail route (GET/PUT /api/orders/[id], mark-delivered,
// production-complete, invoice, status) so the Shipping delivery-address
// card and the Accounts invoice "Bill To" block actually have data to
// render, instead of always seeing an object with only companyName/email/
// phone. List/summary routes (GET /api/orders, dashboard, activity log,
// notifications, payments) intentionally keep the narrower 'companyName'
// projection — they never render an address or GST block.
export const ORDER_CLIENT_DETAIL_FIELDS =
  'companyName clientCode email phone contactPersonName designation billingAddress shippingAddress sameAsBilling gstNumber invoiceRecipientName invoiceEmail'

// Client sub-fields that carry address/GST/billing detail — only meaningful
// to the roles that actually ship or bill the order. Stripped from the
// embedded client object for every other role, mirroring FINANCE_FIELDS/
// SHIPPING_FIELDS above so the same role can't get this data just because
// the API happens to populate it for someone else's request.
const CLIENT_DETAIL_FIELDS = [
  'contactPersonName', 'designation', 'billingAddress', 'shippingAddress',
  'sameAsBilling', 'gstNumber', 'invoiceRecipientName', 'invoiceEmail',
] as const

// Includes 'operations' — the delivery address lives on the embedded client
// object, and an operations user needs it to actually ship anything.
export const CAN_VIEW_CLIENT_DETAILS: Role[] = ['admin', 'sales', 'accounting', 'operations']

/**
 * Restricts a queue listing to "my assigned tasks only" by default for the
 * given roles, with two optional escape hatches — never mixed into the
 * default view. Roles not listed in `restrictedRoles` (e.g. admin/managers)
 * are left unrestricted so they keep seeing everything, same as before this
 * existed.
 *
 * `unassignedViewRoles` gates who may use `view=unassigned` (a self-serve
 * pickup bucket — Creative allows this, Production never does: unassigned
 * production tasks are Admin-only). `allAssignedViewRoles` gates who may use
 * `view=all` (everyone's assigned tasks, still excluding unassigned —
 * Production's "All" tab uses this so a Production user can see their
 * teammates' batches without ever seeing the unassigned bucket). A
 * restricted role not listed for a given view falls straight through to the
 * normal "my assigned tasks" restriction even if it forges that param — it
 * can't use it to see anyone else's or nobody's tasks.
 *
 * Shared shape so every queue applies the identical rule via one function
 * instead of duplicating role/query logic — Creative and Production both
 * call this today (see app/api/orders/route.ts).
 */
export function applyOwnQueueVisibility(
  query: Record<string, unknown>,
  session: SessionUser,
  opts: {
    restrictedRoles: Role[]
    assignmentField: string
    view: string
    unassignedViewRoles: Role[]
    allAssignedViewRoles?: Role[]
  }
): void {
  const { restrictedRoles, assignmentField, view, unassignedViewRoles, allAssignedViewRoles = [] } = opts
  if (view === 'unassigned' && unassignedViewRoles.includes(session.role)) {
    query[assignmentField] = { $exists: false }
    return
  }
  if (view === 'all' && allAssignedViewRoles.includes(session.role)) {
    query[assignmentField] = { $exists: true }
    return
  }
  if (restrictedRoles.includes(session.role)) {
    query[assignmentField] = session.id
  }
}

/** Extracts a comparable id string from an assignedTeam slot, whether it's a raw ObjectId, a populated {_id, name} doc, or unset. */
function assigneeIdString(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
    return String((value as { _id: unknown })._id)
  }
  return String(value)
}

/**
 * Whether `order` is currently assigned to this exact session user in the
 * given slot — used to gate WRITE actions (design-status edits, production-
 * stage edits, production-complete) so a creative/production user can't act
 * on a teammate's order just by knowing/guessing its id. Works against both
 * an unpopulated Mongoose document (raw ObjectId) and a populated/lean object
 * ({_id, name}), since PUT /api/orders/[id] uses the former and GET the latter.
 */
export function isOrderAssignedToSelf(
  order: { assignedTeam?: { creativeExecutive?: unknown; productionManager?: unknown } | null },
  session: SessionUser,
  assignmentField: 'creativeExecutive' | 'productionManager'
): boolean {
  const id = assigneeIdString(order.assignedTeam?.[assignmentField])
  return id !== undefined && id === session.id
}

/**
 * Whether a 'creative' or 'operations' session may view this order's detail
 * at all (GET /api/orders/[id]) — mirrors applyOwnQueueVisibility's list
 * rules so list and detail can never disagree. Creative may view their own
 * claimed work plus the still-unclaimed pool (matching the Unassigned tab);
 * operations may view any order assigned to *some* operations user, own or a
 * teammate's (matching the My Queue/All tabs — there is no unassigned view
 * for operations). Every other role is unrestricted, same as before this
 * existed. Closes the gap where applyOwnQueueVisibility only filtered the
 * list query, never the item-level GET, so a restricted-role user could
 * bypass "my queue only" simply by opening an order's detail URL directly.
 *
 * 'operations' is also the Shipping team ("Production team is also Shipping
 * team"): the Shipping queue lists every shipping-relevant order to all
 * shipping roles with no per-assignee restriction (see relevantTo=shipping in
 * app/api/orders/route.ts), so an operations user must be able to OPEN any of
 * those too — even one that reached shipping without a production manager ever
 * being assigned (e.g. admin drove it to shipping_ready directly). Without
 * this clause such an order shows in their Shipping list but 403s on open.
 * Additive and role-scoped: it only widens 'operations', exposes nothing the
 * Shipping list didn't already show them, and callers that don't select
 * `status` (unaffected routes) simply fall through to the assignment check.
 */
export function canViewOrderDetail(
  order: { assignedTeam?: { creativeExecutive?: unknown; productionManager?: unknown } | null; status?: OrderStatus },
  session: SessionUser
): boolean {
  if (session.role === 'creative') {
    const id = assigneeIdString(order.assignedTeam?.creativeExecutive)
    return id === undefined || id === session.id
  }
  if (session.role === 'operations') {
    if (order.status && SHIPPING_RELEVANT_STATUSES.includes(order.status)) return true
    return assigneeIdString(order.assignedTeam?.productionManager) !== undefined
  }
  return true
}

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

// ActivityLog descriptions are free-text and frequently embed the exact
// figures/details FINANCE_FIELDS/SHIPPING_FIELDS otherwise strip from the
// order object itself (e.g. "Payment of ₹77,777 recorded for ORD-2135",
// "Order ORD-2135 dispatched via SecretCourierXYZ") — a side-channel that
// bypassed stripSensitiveOrderFields entirely, since logs travel alongside
// the order in the same API response but were never filtered themselves.
const FINANCE_ACTIVITY_TYPES = new Set(['payment_recorded', 'invoice_uploaded', 'payment_reminder_sent'])
const SHIPPING_ACTIVITY_TYPES = new Set(['order_dispatched'])

/**
 * Filters an order's activity-log entries down to ones whose description
 * can't reveal finance/shipping data the viewing role isn't allowed to see —
 * the log-entry equivalent of stripSensitiveOrderFields. Entries of any other
 * type (status changes, assignment, production progress, notes/assets added)
 * are unaffected; they don't embed protected figures.
 */
export function filterActivityLogsForRole<T extends { type: string }>(logs: T[], role: Role): T[] {
  return logs.filter((log) => {
    if (FINANCE_ACTIVITY_TYPES.has(log.type) && !CAN_VIEW_FINANCE.includes(role)) return false
    if (SHIPPING_ACTIVITY_TYPES.has(log.type) && !CAN_VIEW_SHIPPING.includes(role)) return false
    return true
  })
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
