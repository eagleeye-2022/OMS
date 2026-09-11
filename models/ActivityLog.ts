import { Schema, Document, model, models, Types } from 'mongoose'

export interface IActivityLogDocument extends Document {
  type: string
  description: string
  order?: Types.ObjectId
  client?: Types.ObjectId
  lead?: Types.ObjectId
  // Manually-logged activities (e.g. the Leads "Add Activity" modal) carry a
  // distinct title separate from the descriptive `description`, and a
  // user-picked `activityAt` timestamp — system-generated entries (order
  // status changes, client creation, etc.) leave both undefined and are
  // timestamped by `createdAt` alone.
  title?: string
  activityAt?: Date
  user: Types.ObjectId
  userName: string
  metadata?: Record<string, unknown>
}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    title: { type: String, trim: true },
    activityAt: { type: Date },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

ActivityLogSchema.index({ order: 1 })
ActivityLogSchema.index({ lead: 1 })
ActivityLogSchema.index({ createdAt: -1 })

const ActivityLog = models.ActivityLog || model<IActivityLogDocument>('ActivityLog', ActivityLogSchema)
export default ActivityLog
