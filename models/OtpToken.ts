import mongoose, { Schema, Document, model, models, Types } from 'mongoose'

export type OtpPurpose = 'login'

export interface IOtpTokenDocument extends Document {
  user: Types.ObjectId
  purpose: OtpPurpose
  otpHash: string
  expiresAt: Date
  used: boolean
  attempts: number
}

const OtpTokenSchema = new Schema<IOtpTokenDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The app has only one OTP flow (login), but every query still filters
    // by purpose so a second flow could be added later without silently
    // accepting a code issued for a different purpose. See app/api/auth/.
    purpose: { type: String, enum: ['login'], required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Mongo TTL index — documents are auto-deleted once expiresAt passes, so
// spent/abandoned OTPs never accumulate and don't need a manual cleanup job.
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const OtpToken = models.OtpToken || model<IOtpTokenDocument>('OtpToken', OtpTokenSchema)
export default OtpToken

// suppress unused import warning
void mongoose
