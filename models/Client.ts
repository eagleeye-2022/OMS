import { Schema, Document, model, models, Types } from 'mongoose'
import type { ClientType, ClientStatus, PaymentTerms, PreferredPaymentMode } from '@/lib/constants'

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
  uploadedAt: Date
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

export interface IClientDocument extends Document {
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
  /**
   * Sales-reference estimate of this client's typical order size, captured
   * at billing time — NOT a real order total (orders are created and priced
   * in the Orders module) and not a credit limit/enforcement figure. Purely
   * informational, same spirit as productPreferences.
   */
  typicalOrderValue?: number
  invoiceRecipientName?: string
  invoiceEmail?: string
  deliveryDate?: Date
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
  createdBy: Types.ObjectId
  updatedBy?: Types.ObjectId
}

const AddressSchema = new Schema<IAddress>(
  {
    pinCode: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false }
)

const AssetFileSchema = new Schema<IAssetFile>(
  {
    url: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const EscalationContactSchema = new Schema<IEscalationContact>(
  {
    recipientName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mobileNumber: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false }
)

const ProductPreferenceSchema = new Schema<IProductPreference>(
  {
    preferredProductCategory: { type: String, required: true },
    orderQuantity: { type: Number, required: true, min: 1 },
    orderNote: { type: String, required: true },
  },
  { _id: false }
)

const ClientSchema = new Schema<IClientDocument>(
  {
    clientCode: { type: String, required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    clientType: { type: String, enum: ['individual', 'corporate'], default: 'individual' },
    status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
    contactPersonName: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    sameAsBilling: { type: Boolean, default: true },
    billingAddress: { type: AddressSchema, default: () => ({}) },
    shippingAddress: { type: AddressSchema, default: () => ({}) },
    gstNumber: { type: String, trim: true, uppercase: true },
    defaultAdvanceRequirement: { type: Number, min: 0, max: 100 },
    defaultPaymentTerms: {
      type: String,
      enum: [
        'custom', '100_advance', '75_advance_balance_dispatch',
        '50_advance_balance_dispatch', '50_advance_balance_delivery',
        '30_days_credit', '45_days_credit',
      ],
    },
    customPaymentTerms: { type: String },
    preferredPaymentMode: { type: String, enum: ['bank_transfer', 'upi', 'cheque', 'cash'] },
    typicalOrderValue: { type: Number, min: 0 },
    invoiceRecipientName: { type: String, trim: true },
    invoiceEmail: { type: String, trim: true, lowercase: true },
    deliveryDate: { type: Date },
    escalationContact: { type: EscalationContactSchema, default: () => ({}) },
    assets: {
      companyLogo: { type: AssetFileSchema },
      brandGuidelines: { type: AssetFileSchema },
      artworkReferences: { type: AssetFileSchema },
      previousDesigns: { type: AssetFileSchema },
    },
    sharedLinks: {
      googleDriveFolder: { type: String, trim: true },
      dropboxFolder: { type: String, trim: true },
      websiteUrl: { type: String, trim: true },
      socialMedia: { type: String, trim: true },
    },
    productPreferences: { type: [ProductPreferenceSchema], default: [] },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ClientSchema.index({ companyName: 'text', contactPersonName: 'text', email: 'text' })

ClientSchema.pre('validate', async function () {
  if (this.isNew && !this.clientCode) {
    const Client = models.Client || model<IClientDocument>('Client', ClientSchema)
    // Numeric collation ensures "CLI-1000" sorts after "CLI-999" (plain string sort would not).
    const last = await Client.findOne({ clientCode: { $exists: true } })
      .collation({ locale: 'en_US', numericOrdering: true })
      .sort({ clientCode: -1 })
      .select('clientCode')
      .lean<{ clientCode?: string }>()
    let nextNum = 1001
    if (last?.clientCode) {
      const match = last.clientCode.match(/\d+/)
      if (match) nextNum = parseInt(match[0]) + 1
    }
    this.clientCode = `CLI-${nextNum}`
  }
})

const Client = models.Client || model<IClientDocument>('Client', ClientSchema)
export default Client
