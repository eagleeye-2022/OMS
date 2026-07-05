import { Schema, Document, model, models, Types } from 'mongoose'
import type { OrderStatus, DesignStatus, ProductionStage, ProductionStageStatus, PaymentStatus, Priority, NoteType } from '@/lib/constants'

export interface IOrderNote {
  text: string
  authorId: Types.ObjectId
  authorName: string
  at: Date
  noteType: NoteType
}

export interface IOrderAsset {
  label: string
  url: string
  kind: 'drive_link' | 'file'
  mimeType?: string
  size?: number
  addedBy: Types.ObjectId
  addedByName: string
  addedAt: Date
}

export interface IAssignedTeam {
  salesExecutive?: Types.ObjectId
  creativeExecutive?: Types.ObjectId
  productionManager?: Types.ObjectId
}

export interface IProductionStageProgress {
  status: ProductionStageStatus
  unitsCompleted: number
  totalUnits: number
  updatedAt?: Date
  updatedBy?: Types.ObjectId
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
  invoiceDate?: Date
  amount: number
  cgstPercent?: number
  sgstPercent?: number
  dueDate?: Date
  notes?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  isFinal: boolean
  sentToClient: boolean
  sentAt?: Date
  uploadedAt?: Date
  uploadedBy?: Types.ObjectId
}

export interface IOrderDocument extends Document {
  orderNumber: string
  client: Types.ObjectId
  category: string
  productType: string
  quantity: number
  sizeBreakdown?: string
  deliveryDate: Date
  priority: Priority
  status: OrderStatus
  designStatus: DesignStatus
  productionStage?: ProductionStage
  productionStages: IProductionStages
  productionCompletedAt?: Date
  productionCompletedBy?: Types.ObjectId
  courierPartner?: string
  trackingNumber?: string
  dispatchDate?: Date
  expectedDeliveryDate?: Date
  shipmentWeight?: number
  packageCount?: number
  deliveredAt?: Date
  deliveredBy?: Types.ObjectId
  delayReason?: string
  invoice?: IInvoice
  totalAmount: number
  advancePaid: number
  balanceDue: number
  paymentStatus: PaymentStatus
  notes: IOrderNote[]
  assets: IOrderAsset[]
  creativeRemarks?: string
  productionRemarks?: string
  revisionHistory: { note: string; by: string; at: Date }[]
  assignedTeam: IAssignedTeam
  createdBy: Types.ObjectId
}

const OrderNoteSchema = new Schema<IOrderNote>(
  {
    text: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    at: { type: Date, default: Date.now },
    noteType: { type: String, enum: ['general', 'creative', 'production', 'shipping', 'accounts'], default: 'general' },
  },
  { _id: false }
)

const OrderAssetSchema = new Schema<IOrderAsset>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    kind: { type: String, enum: ['drive_link', 'file'], required: true },
    mimeType: { type: String },
    size: { type: Number },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedByName: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const AssignedTeamSchema = new Schema<IAssignedTeam>(
  {
    salesExecutive: { type: Schema.Types.ObjectId, ref: 'User' },
    creativeExecutive: { type: Schema.Types.ObjectId, ref: 'User' },
    productionManager: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
)

const ProductionStageProgressSchema = new Schema<IProductionStageProgress>(
  {
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    unitsCompleted: { type: Number, default: 0, min: 0 },
    totalUnits: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    workerName: { type: String, trim: true },
    note: { type: String },
  },
  { _id: false }
)

const productionStageDefault = () => ({ status: 'pending', unitsCompleted: 0, totalUnits: 0 })

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    invoiceType: { type: String, enum: ['tax_invoice', 'proforma_invoice', 'receipt'], default: 'tax_invoice' },
    invoiceDate: { type: Date },
    amount: { type: Number, required: true, min: 0 },
    cgstPercent: { type: Number, min: 0 },
    sgstPercent: { type: Number, min: 0 },
    dueDate: { type: Date },
    notes: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    isFinal: { type: Boolean, default: false },
    sentToClient: { type: Boolean, default: false },
    sentAt: { type: Date },
    uploadedAt: { type: Date },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    category: { type: String, required: true },
    productType: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    sizeBreakdown: { type: String },
    deliveryDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    status: {
      type: String,
      enum: [
        'pending', 'design_review', 'design_approved', 'in_production',
        'quality_check', 'shipping_ready', 'dispatched', 'in_transit',
        'delivered', 'cancelled', 'delayed',
      ],
      default: 'pending',
    },
    designStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'in_review', 'revision_requested', 'client_approved', 'rejected'],
      default: 'pending',
    },
    productionStage: {
      type: String,
      enum: ['printing', 'stitching', 'finishing', 'quality_check', 'completed'],
    },
    productionStages: {
      printing: { type: ProductionStageProgressSchema, default: productionStageDefault },
      stitching: { type: ProductionStageProgressSchema, default: productionStageDefault },
      finishing: { type: ProductionStageProgressSchema, default: productionStageDefault },
      qcCheck: { type: ProductionStageProgressSchema, default: productionStageDefault },
    },
    productionCompletedAt: { type: Date },
    productionCompletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    courierPartner: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    dispatchDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    shipmentWeight: { type: Number, min: 0 },
    packageCount: { type: Number, min: 0 },
    deliveredAt: { type: Date },
    deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    delayReason: { type: String },
    invoice: { type: InvoiceSchema },
    totalAmount: { type: Number, required: true, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending',
    },
    notes: { type: [OrderNoteSchema], default: [] },
    assets: { type: [OrderAssetSchema], default: [] },
    creativeRemarks: { type: String },
    productionRemarks: { type: String },
    revisionHistory: [
      {
        note: String,
        by: String,
        at: { type: Date, default: Date.now },
      },
    ],
    assignedTeam: { type: AssignedTeamSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

OrderSchema.index({ client: 1, status: 1 })
OrderSchema.index({ deliveryDate: 1 })
OrderSchema.index({ orderNumber: 'text' })

const Order = models.Order || model<IOrderDocument>('Order', OrderSchema)
export default Order
