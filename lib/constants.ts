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
//   Shipping:       admin, sales, accounts — the 'shipping' role itself is
//                   explicitly excluded (a deliberate business rule, not an
//                   oversight; see ROLE_DEFAULT_REDIRECT note below)
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
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['dashboard', 'clients', 'orders', 'creative-queue', 'production', 'shipping', 'accounts', 'user-roles', 'settings'],
  sales: ['clients', 'orders', 'shipping'],
  creative: ['creative-queue'],
  production: ['production'],
  shipping: [],
  accounts: ['accounts', 'shipping'],
}

// The 'shipping' role has no module permissions of its own (see above). Its
// default redirect used to point at '/' (the dashboard), back when the
// dashboard had no role guard — now that the dashboard is admin-only, '/'
// would immediately bounce it again. '/no-access' is a dedicated, guard-free
// landing page for roles with zero assigned modules.
export const ROLE_DEFAULT_REDIRECT: Record<Role, string> = {
  admin: '/',
  sales: '/clients',
  creative: '/creative-queue',
  production: '/production',
  shipping: '/no-access',
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
