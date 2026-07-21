import mongoose, { Schema, Document, model, models } from 'mongoose'
import bcrypt from 'bcryptjs'
import type { Role } from '@/lib/constants'

export interface IUserDocument extends Document {
  name: string
  email: string
  password: string
  role: Role
  phone?: string
  isActive: boolean
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
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

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

const User = models.User || model<IUserDocument>('User', UserSchema)
export default User

// suppress unused import warning
void mongoose
