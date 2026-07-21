import mongoose, { Schema, Document, model, models } from 'mongoose'
import type { Role } from '@/lib/constants'

export interface IUserDocument extends Document {
  name: string
  email: string
  role: Role
  phone?: string
  isActive: boolean
}

// No password field — login is passwordless (email + OTP only; see
// /api/auth/request-login-otp and /api/auth/verify-login-otp). A user's
// ability to log in is governed entirely by `isActive` plus having an
// account with a matching email; nothing here is ever checked against a
// credential.
const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['admin', 'sales', 'creative', 'operations', 'accounting'],
      required: true,
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const User = models.User || model<IUserDocument>('User', UserSchema)
export default User

// suppress unused import warning
void mongoose
