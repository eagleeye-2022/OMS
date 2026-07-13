import type {
  Role,
  OrderStatus,
  DesignStatus,
  ProductionStage,
  ProductionStageStatus,
  ProductionStageKey,
  PaymentStatus,
  ClientType,
  ClientStatus,
  PaymentTerms,
  PreferredPaymentMode,
  Priority,
  NoteType,
} from '@/lib/constants'

export type {
  Role,
  OrderStatus,
  DesignStatus,
  ProductionStage,
  ProductionStageStatus,
  ProductionStageKey,
  PaymentStatus,
  ClientType,
  ClientStatus,
  PaymentTerms,
  PreferredPaymentMode,
  Priority,
  NoteType,
}

export interface IUser {
  _id: string
  name: string
  email: string
  role: Role
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface IAddress {
  pinCode: string
  city?: string
  state?: string
  country?: string
  landmark?: string
}

export interface IAssetFile {
  url: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
}

export interface IEscalationContact {
  recipientName?: string
  email?: string
  mobileNumber?: string
  address?: string
}

export interface IProductPreference {
  preferredProductCategory: string
  orderQuantity: number
  orderNote: string
}

export interface IClient {
  _id: string
  clientCode: string
  companyName: string
  clientType: ClientType
  status: ClientStatus
  contactPersonName?: string
  designation?: string
  phone?: string
  alternatePhone?: string
  email?: string
  sameAsBilling: boolean
  billingAddress: IAddress
  shippingAddress: IAddress
  gstNumber?: string
  defaultAdvanceRequirement?: number
  defaultPaymentTerms?: PaymentTerms
  customPaymentTerms?: string
  preferredPaymentMode?: PreferredPaymentMode
  typicalOrderValue?: number
  invoiceRecipientName?: string
  invoiceEmail?: string
  deliveryDate?: string
  escalationContact: IEscalationContact
  assets: {
    companyLogo?: IAssetFile
    brandGuidelines?: IAssetFile
    artworkReferences?: IAssetFile
    previousDesigns?: IAssetFile
  }
  sharedLinks: {
    googleDriveFolder?: string
    dropboxFolder?: string
    websiteUrl?: string
    socialMedia?: string
  }
  productPreferences: IProductPreference[]
  notes?: string
  createdBy?: IUser | string
  updatedBy?: IUser | string
  createdAt: string
  updatedAt: string
  // Computed on read, not stored
  totalOrders?: number
  activeOrders?: number
  lifetimeBusiness?: number
  lastOrderDate?: string | null
}

export interface RevisionEntry {
  note: string
  by: string
  at: string
}

export interface IOrderNote {
  text: string
  authorId: IUser | string
  authorName: string
  at: string
  noteType: NoteType
}

export interface IOrderAsset {
  label: string
  url: string
  kind: 'drive_link' | 'file'
  mimeType?: string
  size?: number
  addedBy: IUser | string
  addedByName: string
  addedAt: string
}

export interface IAssignedTeam {
  salesExecutive?: IUser | string
  creativeExecutive?: IUser | string
  productionManager?: IUser | string
}

export interface IProductionStageProgress {
  status: ProductionStageStatus
  unitsCompleted: number
  totalUnits: number
  updatedAt?: string
  updatedBy?: IUser | string
  workerName?: string
  note?: string
}

export interface IProductionStages {
  printing: IProductionStageProgress
  stitching: IProductionStageProgress
  finishing: IProductionStageProgress
  qcCheck: IProductionStageProgress
}

export interface IInvoice {
  invoiceNumber: string
  invoiceType: 'tax_invoice' | 'proforma_invoice' | 'receipt'
  invoiceDate?: string
  amount: number
  cgstPercent?: number
  sgstPercent?: number
  dueDate?: string
  notes?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isFinal: boolean
  sentToClient: boolean
  sentAt?: string
  uploadedAt?: string
  uploadedBy?: IUser | string
}

export interface IOrder {
  _id: string
  orderNumber: string
  client: IClient | string
  category: string
  productType: string
  quantity: number
  sizeBreakdown?: string
  deliveryDate: string
  priority: Priority
  status: OrderStatus
  designStatus: DesignStatus
  productionStage?: ProductionStage
  productionStages: IProductionStages
  productionCompletedAt?: string
  productionCompletedBy?: IUser | string
  courierPartner?: string
  trackingNumber?: string
  dispatchDate?: string
  expectedDeliveryDate?: string
  shipmentWeight?: number
  packageCount?: number
  deliveredAt?: string
  deliveredBy?: IUser | string
  delayReason?: string
  invoice?: IInvoice
  // Finance fields are omitted entirely (not just falsy) in API responses to
  // roles without finance visibility (Creative/Production) — always guard
  // reads of these with a canViewFinance check, don't rely on `?? 0` alone.
  totalAmount?: number
  advancePaid?: number
  balanceDue?: number
  paymentStatus?: PaymentStatus
  // Derived server-side (see lib/order-status.ts's getDispatchBlockReason) —
  // present for every role, including 'shipping', which never receives raw
  // paymentStatus above. Non-null means the order is overdue AND unpaid, so
  // dispatch (shipping_ready -> dispatched) is currently blocked.
  dispatchBlockedReason?: string | null
  notes: IOrderNote[]
  assets: IOrderAsset[]
  creativeRemarks?: string
  productionRemarks?: string
  revisionHistory: RevisionEntry[]
  // Genuinely absent (not just empty) until the first team-assignment call —
  // Mongoose's default `{}` for this subdocument gets stripped by `minimize`
  // when saved with no sub-fields set, since order creation never sends this
  // key at all. Always optional-chain reads of this.
  assignedTeam?: IAssignedTeam
  createdBy: IUser | string
  createdAt: string
  updatedAt: string
}

export interface IPayment {
  _id: string
  order: IOrder | string
  client: IClient | string
  receiptNumber: string
  amount: number
  paymentDate: string
  method: string
  reference?: string
  notes?: string
  invoiceUrl?: string
  recordedBy: IUser | string
  createdAt: string
}

export interface IActivityLog {
  _id: string
  type: string
  description: string
  order?: IOrder | string
  client?: IClient | string
  user: IUser | string
  userName: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface INotification {
  _id: string
  type: string
  title: string
  message: string
  order?: IOrder | string
  client?: IClient | string
  isRead: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
}

export interface IProduct {
  _id: string
  name: string
  category: string
  description?: string
  basePrice: number
  unit: string
  isActive: boolean
  createdAt: string
}

export interface IInventory {
  _id: string
  product: IProduct | string
  material: string
  quantity: number
  unit: string
  reorderLevel: number
  lastUpdated: string
}

export interface DashboardStats {
  totalOrders: number
  activeOrders: number
  pendingApproval: number
  delayed: number
  revenue: number
  outstanding: number
  newThisMonth: number
}

export interface PipelineBreakdown {
  creative: number
  production: number
  qc: number
  shipping: number
  pending: number
  total: number
}

export interface StageMonitorItem {
  stage: string
  count: number
  percentage: number
}

export interface DeliveryDeadlineItem {
  orderId: string
  orderNumber: string
  clientName: string
  deliveryDate: string
  daysLeft: number
  status: OrderStatus
}

export interface MonthlyDataPoint {
  month: string
  orders: number
  revenue: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
