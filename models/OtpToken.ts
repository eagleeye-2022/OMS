import mongoose, { Schema, Document, model, models, Types } from 'mongoose'

export type OtpPurpose = 'login' | 'password_reset'

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
    // Scopes a code to the single flow it was issued for. Login and
    // password-reset share this exact same generate/hash/verify mechanism
    // (formerly two copies of the same model, one per flow), so without this
    // field a code requested to log in could also be spent to reset a
    // password, or vice versa — two different security actions silently
    // sharing one proof-of-inbox-access token. Every query against this
    // model must filter by purpose; see the routes under app/api/auth/.
    purpose: { type: String, enum: ['login', 'password_reset'], required: true },
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
