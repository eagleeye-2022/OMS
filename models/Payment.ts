import { Schema, Document, model, models, Types } from 'mongoose'

export interface IPaymentDocument extends Document {
  order: Types.ObjectId
  client: Types.ObjectId
  receiptNumber: string
  amount: number
  paymentDate: Date
  method: string
  reference?: string
  notes?: string
  invoiceUrl?: string
  recordedBy: Types.ObjectId
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    receiptNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    method: { type: String, required: true },
    reference: { type: String, trim: true },
    notes: { type: String },
    invoiceUrl: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

PaymentSchema.index({ order: 1 })
PaymentSchema.index({ client: 1 })

const Payment = models.Payment || model<IPaymentDocument>('Payment', PaymentSchema)
export default Payment
