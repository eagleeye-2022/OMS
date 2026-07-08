export const ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  CREATIVE: 'creative',
  PRODUCTION: 'production',
  SHIPPING: 'shipping',
  ACCOUNTS: 'accounts',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ORDER_STATUS = {
  PENDING: 'pending',
  DESIGN_REVIEW: 'design_review',
  DESIGN_APPROVED: 'design_approved',
  IN_PRODUCTION: 'in_production',
  QUALITY_CHECK: 'quality_check',
  SHIPPING_READY: 'shipping_ready',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  DELAYED: 'delayed',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const CLOSED_ORDER_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

// Statuses reached before Creative has approved the design. The production
// role must never be able to progress a production stage or complete
// production while an order is still here — there's nothing approved to
// produce yet. Client-safe (no model imports), so both the API route guard
// (lib/order-status.ts re-exports this) and the Production UI (queue/detail)
// can share the exact same definition of "not ready for production."
export const PRE_DESIGN_APPROVAL_STATUSES: OrderStatus[] = ['pending', 'design_review']

export const DESIGN_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  REVISION_REQUESTED: 'revision_requested',
  CLIENT_APPROVED: 'client_approved',
  REJECTED: 'rejected',
} as const

export type DesignStatus = (typeof DESIGN_STATUS)[keyof typeof DESIGN_STATUS]

export const DESIGN_STATUS_LABEL: Record<DesignStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  in_review: 'In Review',
  revision_requested: 'Revision Requested',
  client_approved: 'Client Approved',
  rejected: 'Rejected',
}

export const DESIGN_STATUS_COLOR: Record<DesignStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  client_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export const CREATIVE_BOARD_COLUMNS = ['design_pending', 'in_progress', 'awaiting_approval', 'approved'] as const

export type CreativeBoardColumn = (typeof CREATIVE_BOARD_COLUMNS)[number]

export const CREATIVE_BOARD_COLUMN_LABEL: Record<CreativeBoardColumn, string> = {
  design_pending: 'Design Pending',
  in_progress: 'In Progress',
  awaiting_approval: 'Awaiting Approval',
  approved: 'Approved',
}

// Maps the granular designStatus onto the board's 4 columns. Revision
// requests cycle back into "In Progress" per the workflow rule (client asked
// for changes → back to active design work), and a rare 'rejected' order
// resurfaces under "Design Pending" rather than a 5th column not in the design.
export const DESIGN_STATUS_TO_BOARD_COLUMN: Record<DesignStatus, CreativeBoardColumn> = {
  pending: 'design_pending',
  in_progress: 'in_progress',
  in_review: 'awaiting_approval',
  revision_requested: 'in_progress',
  client_approved: 'approved',
  rejected: 'design_pending',
}

export const PRODUCTION_STAGE = {
  PRINTING: 'printing',
  STITCHING: 'stitching',
  FINISHING: 'finishing',
  QUALITY_CHECK: 'quality_check',
  COMPLETED: 'completed',
} as const

export type ProductionStage = (typeof PRODUCTION_STAGE)[keyof typeof PRODUCTION_STAGE]

// Structured per-stage progress status (distinct from the legacy single
// "which stage are we on" PRODUCTION_STAGE pointer above, which stays as-is
// for the admin-facing generic Orders view).
export const PRODUCTION_STAGE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const

export type ProductionStageStatus = (typeof PRODUCTION_STAGE_STATUS)[keyof typeof PRODUCTION_STAGE_STATUS]

export const PRODUCTION_STAGE_STATUS_LABEL: Record<ProductionStageStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export const PRODUCTION_STAGE_STATUS_COLOR: Record<ProductionStageStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

export const PRODUCTION_STAGE_KEYS = ['printing', 'stitching', 'finishing', 'qcCheck'] as const

export type ProductionStageKey = (typeof PRODUCTION_STAGE_KEYS)[number]

export const PRODUCTION_STAGE_KEY_LABEL: Record<ProductionStageKey, string> = {
  printing: 'Printing',
  stitching: 'Stitching',
  finishing: 'Finishing',
  qcCheck: 'QC Check',
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
} as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

export const ACTIVITY_TYPE = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  DESIGN_UPLOADED: 'design_uploaded',
  DESIGN_APPROVED: 'design_approved',
  DESIGN_REJECTED: 'design_rejected',
  PRODUCTION_STARTED: 'production_started',
  PRODUCTION_STAGE_UPDATED: 'production_stage_updated',
  PRODUCTION_COMPLETED: 'production_completed',
  ORDER_DISPATCHED: 'order_dispatched',
  ORDER_DELIVERED: 'order_delivered',
  PAYMENT_RECORDED: 'payment_recorded',
  CLIENT_CREATED: 'client_created',
  STATUS_CHANGED: 'status_changed',
  INVOICE_UPLOADED: 'invoice_uploaded',
  PAYMENT_REMINDER_SENT: 'payment_reminder_sent',
} as const

export const NOTIFICATION_TYPE = {
  ORDER_OVERDUE: 'order_overdue',
  PAYMENT_PENDING: 'payment_pending',
  DESIGN_APPROVED: 'design_approved',
  NEW_CLIENT: 'new_client',
  DISPATCH_UPDATE: 'dispatch_update',
  ORDER_FLAGGED: 'order_flagged',
  GENERAL: 'general',
} as const

// Final confirmed module access matrix (audited):
//   Dashboard:      admin only
//   Clients:        admin, sales only (accounts explicitly excluded — no view/edit)
//   Orders:         admin, sales only
//   Creative Queue: admin, creative
//   Production:     admin, production
//   Shipping:       admin, sales, accounts, shipping — the 'shipping' role
//                   gets view access to its own module (see CAN_VIEW_SHIPPING/
//                   CAN_VIEW_CLIENT_DETAILS in lib/order-visibility.ts, which
//                   must include it too or the module renders with courier/
//                   tracking/delivery-address fields silently stripped).
//                   Write actions (courier assignment, status transitions,
//                   marking delivered) remain admin/sales/accounts-only —
//                   that's a separate, deliberate business rule this role
//                   change does not touch.
//   Accounts:       admin, accounts
//
// Important: accounts does NOT get the generic Orders module/sidebar/page.
// It still legitimately touches order data through the Shipping and
// Accounts workflows on the shared Order API — CAN_VIEW_FINANCE and
// CAN_VIEW_SHIPPING (lib/order-visibility.ts), the courierPartner PUT
// intent, and ROLE_ALLOWED_STATUSES.accounts (lib/order-status.ts) all
// correctly include accounts and must NOT be removed when reconciling this
// list — those are Shipping/Accounts-module rights riding the shared
// endpoint, not Orders-module rights.
// 'settings' is granted to every role, not just admin — it's the self-service
// profile/password page (see app/(dashboard)/settings/), so it's appended to
// every list below rather than gating it like the operational modules above.
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['dashboard', 'clients', 'orders', 'creative-queue', 'production', 'shipping', 'accounts', 'user-roles', 'settings'],
  sales: ['clients', 'orders', 'shipping', 'settings'],
  creative: ['creative-queue', 'settings'],
  production: ['production', 'settings'],
  shipping: ['shipping', 'settings'],
  accounts: ['accounts', 'shipping', 'settings'],
}

// The 'shipping' role now lands on its own module (see ROLE_PERMISSIONS
// above). '/no-access' remains a dedicated, guard-free landing page for any
// role configured with zero assigned modules — none currently, but kept for
// roles added in the future without a module wired up yet.
export const ROLE_DEFAULT_REDIRECT: Record<Role, string> = {
  admin: '/',
  sales: '/clients',
  creative: '/creative-queue',
  production: '/production',
  shipping: '/shipping',
  accounts: '/accounts',
}

export const NOTE_TYPE = {
  GENERAL: 'general',
  CREATIVE: 'creative',
  PRODUCTION: 'production',
  SHIPPING: 'shipping',
  ACCOUNTS: 'accounts',
} as const

export type NoteType = (typeof NOTE_TYPE)[keyof typeof NOTE_TYPE]

export const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  general: 'General',
  creative: 'Creative',
  production: 'Production',
  shipping: 'Shipping',
  accounts: 'Accounts',
}

// Which note domains each role may read AND write — order notes are fully
// siloed by domain (not just relabeled views of one shared thread anymore).
// Mirrors the module access matrix above: a role only sees/creates notes
// tagged for its own domain, except admin (all domains). Note the 'shipping'
// NOTE TYPE (used by admin/sales/accounts for Shipping-module remarks) is a
// different thing from the 'shipping' ROLE, which has zero module access
// under the final matrix and correspondingly gets no note domain either.
export const NOTE_TYPE_ACCESS: Record<Role, NoteType[]> = {
  admin: ['general', 'creative', 'production', 'shipping', 'accounts'],
  sales: ['general'],
  creative: ['creative'],
  production: ['production'],
  shipping: [],
  accounts: ['accounts'],
}

// Coarse "what should Production do right now" state for a given order,
// distinct from the generic ORDER_STATUS badge shown everywhere else in the
// app — this exists specifically so the Production team can tell at a glance
// whether to start, continue, or stop, without having to interpret a status
// value that also carries Creative/Shipping-facing meaning.
export const PRODUCTION_WORKFLOW_STATE = {
  BLOCKED: 'blocked',
  ON_HOLD: 'on_hold',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
} as const

export type ProductionWorkflowState = (typeof PRODUCTION_WORKFLOW_STATE)[keyof typeof PRODUCTION_WORKFLOW_STATE]

export const PRODUCTION_WORKFLOW_STATE_LABEL: Record<ProductionWorkflowState, string> = {
  blocked: 'Design Not Approved',
  on_hold: 'On Hold',
  ready: 'Ready to Start',
  in_progress: 'In Progress',
}

export const PRODUCTION_WORKFLOW_STATE_COLOR: Record<ProductionWorkflowState, string> = {
  blocked: 'bg-red-50 text-red-700',
  on_hold: 'bg-amber-100 text-amber-700',
  ready: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
}

/**
 * Derives the Production-facing workflow state from the order's real status
 * field — no new data, just a stricter lens on the existing OrderStatus enum.
 * 'shipping_ready' and beyond aren't handled here since those orders have
 * already left the Production queue (relevantTo=production excludes them).
 */
export function getProductionWorkflowState(status: OrderStatus): ProductionWorkflowState {
  if (PRE_DESIGN_APPROVAL_STATUSES.includes(status)) return 'blocked'
  if (status === 'delayed') return 'on_hold'
  if (status === 'design_approved') return 'ready'
  return 'in_progress'
}

/**
 * If the production role should not be able to progress this order right
 * now, returns why; otherwise null. Shared by the stage/productionStage/
 * production-complete write guards (app/api/orders/[id]/route.ts and
 * production-complete/route.ts) and the Production UI (ProductionDetailPage),
 * so the UI never offers an action the API would reject. Admin is never
 * blocked by this — callers gate on role themselves (`role === 'production'`)
 * before consulting it, consistent with every other role-gated intent here.
 */
export function getProductionBlockReason(status: OrderStatus): string | null {
  if (PRE_DESIGN_APPROVAL_STATUSES.includes(status)) {
    return "This order's design hasn't been approved yet — production actions are disabled until Creative approves it."
  }
  if (status === 'delayed') {
    return 'This order is on hold and cannot be progressed until the hold is resolved.'
  }
  return null
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  design_review: 'Design Review',
  design_approved: 'Design Approved',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  shipping_ready: 'Shipping Ready',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  delayed: 'Delayed',
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  design_review: 'bg-blue-100 text-blue-700',
  design_approved: 'bg-indigo-100 text-indigo-700',
  in_production: 'bg-amber-100 text-amber-700',
  quality_check: 'bg-purple-100 text-purple-700',
  shipping_ready: 'bg-teal-100 text-teal-700',
  dispatched: 'bg-cyan-100 text-cyan-700',
  in_transit: 'bg-sky-100 text-sky-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  delayed: 'bg-red-100 text-red-800',
}

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}

export const PRODUCT_CATEGORIES = [
  'Banners',
  'Posters',
  'Brochures',
  'Packaging',
  'ID Cards',
  'Stickers',
  'T-Shirts',
  'Caps',
  'Bags',
  'Flex',
  'Vinyl',
  'Other',
]

export const COURIER_LIST = [
  'FedEx',
  'BlueDart',
  'DTDC',
  'Delhivery',
  'Ecom Express',
  'XpressBees',
  'DHL',
  'India Post',
  'Other',
]

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'UPI',
  'Cash',
  'Cheque',
  'Credit Card',
  'Debit Card',
  'Online',
]

export const CLIENT_TYPE = {
  INDIVIDUAL: 'individual',
  CORPORATE: 'corporate',
} as const

export type ClientType = (typeof CLIENT_TYPE)[keyof typeof CLIENT_TYPE]

export const CLIENT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const

export type ClientStatus = (typeof CLIENT_STATUS)[keyof typeof CLIENT_STATUS]

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  draft: 'Draft',
  active: 'Active Client',
  inactive: 'Inactive',
}

export const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
}

export const PAYMENT_TERMS = {
  CUSTOM: 'custom',
  ADVANCE_100: '100_advance',
  ADVANCE_75_BALANCE_DISPATCH: '75_advance_balance_dispatch',
  ADVANCE_50_BALANCE_DISPATCH: '50_advance_balance_dispatch',
  ADVANCE_50_BALANCE_DELIVERY: '50_advance_balance_delivery',
  CREDIT_30_DAYS: '30_days_credit',
  CREDIT_45_DAYS: '45_days_credit',
} as const

export type PaymentTerms = (typeof PAYMENT_TERMS)[keyof typeof PAYMENT_TERMS]

export const PAYMENT_TERMS_LABEL: Record<PaymentTerms, string> = {
  custom: 'Custom',
  '100_advance': '100% Advance',
  '75_advance_balance_dispatch': '75% Advance + Balance Before Dispatch',
  '50_advance_balance_dispatch': '50% Advance + Balance Before Dispatch',
  '50_advance_balance_delivery': '50% Advance + Balance On Delivery',
  '30_days_credit': '30 Days Credit',
  '45_days_credit': '45 Days Credit',
}

export const PREFERRED_PAYMENT_MODE = {
  BANK_TRANSFER: 'bank_transfer',
  UPI: 'upi',
  CHEQUE: 'cheque',
  CASH: 'cash',
} as const

export type PreferredPaymentMode = (typeof PREFERRED_PAYMENT_MODE)[keyof typeof PREFERRED_PAYMENT_MODE]

export const PREFERRED_PAYMENT_MODE_LABEL: Record<PreferredPaymentMode, string> = {
  bank_transfer: 'Bank Transfer (NEFT/RTGS)',
  upi: 'UPI',
  cheque: 'Cheque',
  cash: 'Cash',
}

export const PREFERRED_PRODUCT_CATEGORIES = [
  'T-Shirts',
  'Hoodies',
  'Caps',
  'Corporate Kits',
  'Uniforms',
  'Promotional Merchandise',
  'Bags',
]

export const PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}

/**
 * Coarse "which team currently owns this order" bucket, derived from the
 * granular OrderStatus enum. Mirrors the grouping already proven in
 * app/api/dashboard/route.ts's inline statusMap — kept as a single shared
 * source so the order list's stage tabs and the dashboard pipeline agree.
 */
export const ORDER_STAGE_BUCKET: Partial<Record<OrderStatus, 'creative' | 'production' | 'shipping' | 'completed'>> = {
  design_review: 'creative',
  design_approved: 'creative',
  in_production: 'production',
  quality_check: 'production',
  shipping_ready: 'shipping',
  dispatched: 'shipping',
  in_transit: 'shipping',
  delivered: 'completed',
}

export const ORDER_STAGE_STATUSES: Record<'creative' | 'production' | 'shipping' | 'completed', OrderStatus[]> = {
  creative: ['design_review', 'design_approved'],
  production: ['in_production', 'quality_check'],
  shipping: ['shipping_ready', 'dispatched', 'in_transit'],
  completed: ['delivered'],
}
