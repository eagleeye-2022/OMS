import { Schema, Document, model, models, Types } from 'mongoose'

export interface INotificationDocument extends Document {
  type: string
  title: string
  message: string
  order?: Types.ObjectId
  client?: Types.ObjectId
  isRead: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    isRead: { type: Boolean, default: false },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
  },
  { timestamps: true }
)

NotificationSchema.index({ isRead: 1, createdAt: -1 })

const Notification = models.Notification || model<INotificationDocument>('Notification', NotificationSchema)
export default Notification
