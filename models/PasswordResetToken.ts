import mongoose, { Schema, Document, model, models, Types } from 'mongoose'

export interface IPasswordResetTokenDocument extends Document {
  user: Types.ObjectId
  otpHash: string
  expiresAt: Date
  used: boolean
  attempts: number
}

const PasswordResetTokenSchema = new Schema<IPasswordResetTokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Mongo TTL index — documents are auto-deleted once expiresAt passes, so
// spent/abandoned OTPs never accumulate and don't need a manual cleanup job.
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const PasswordResetToken =
  models.PasswordResetToken || model<IPasswordResetTokenDocument>('PasswordResetToken', PasswordResetTokenSchema)
export default PasswordResetToken

// suppress unused import warning
void mongoose
