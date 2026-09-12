import { Schema, Document, model, models, Types } from 'mongoose'
import type { LeadStatus, LeadPaymentStatus } from '@/lib/constants'
import type { IAssetFile } from './Client'

export interface ILeadLink {
  label: string
  url: string
}

export interface ILeadDocument extends Document {
  leadCode: string
  name: string
  companyName?: string
  phone: string
  countryCode: string
  email?: string
  address?: string
  source?: string
  status: LeadStatus
  productType: string
  closingDate?: Date
  quantity: number
  amount?: number
  paymentStatus: LeadPaymentStatus
  specialRequirements?: string
  description?: string
  notes?: string
  preferredContactTime?: string
  assignedTo?: Types.ObjectId
  attachments: IAssetFile[]
  links: ILeadLink[]
  convertedClient?: Types.ObjectId
  convertedOrder?: Types.ObjectId
  createdBy: Types.ObjectId
  updatedBy?: Types.ObjectId
}

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

const LeadLinkSchema = new Schema<ILeadLink>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const LeadSchema = new Schema<ILeadDocument>(
  {
    leadCode: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    countryCode: { type: String, trim: true, default: '+91' },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    source: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        'new_enquiries', 'attempted_to_contact', 'contacted', 'proposal_sent',
        'negotiation', 'converted', 'lost', 'contact_in_future',
      ],
      default: 'new_enquiries',
      required: true,
    },
    productType: { type: String, required: true, trim: true },
    closingDate: { type: Date },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    specialRequirements: { type: String },
    description: { type: String },
    notes: { type: String },
    preferredContactTime: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: { type: [AssetFileSchema], default: [] },
    links: { type: [LeadLinkSchema], default: [] },
    convertedClient: { type: Schema.Types.ObjectId, ref: 'Client' },
    convertedOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

LeadSchema.index({ name: 'text', companyName: 'text', email: 'text', phone: 'text' })
LeadSchema.index({ status: 1 })
LeadSchema.index({ assignedTo: 1 })

LeadSchema.pre('validate', async function () {
  if (this.isNew && !this.leadCode) {
    const Lead = models.Lead || model<ILeadDocument>('Lead', LeadSchema)
    // Numeric collation ensures "LD-0010" sorts after "LD-0009" (mirrors
    // Client.clientCode's generation in models/Client.ts).
    const last = await Lead.findOne({ leadCode: { $exists: true } })
      .collation({ locale: 'en_US', numericOrdering: true })
      .sort({ leadCode: -1 })
      .select('leadCode')
      .lean<{ leadCode?: string }>()
    let nextNum = 1
    if (last?.leadCode) {
      const match = last.leadCode.match(/\d+/)
      if (match) nextNum = parseInt(match[0]) + 1
    }
    this.leadCode = `LD-${nextNum}`
  }
})

const Lead = models.Lead || model<ILeadDocument>('Lead', LeadSchema)
export default Lead
