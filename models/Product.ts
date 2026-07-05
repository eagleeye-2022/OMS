import { Schema, Document, model, models } from 'mongoose'

export interface IProductDocument extends Document {
  name: string
  category: string
  description?: string
  basePrice: number
  unit: string
  isActive: boolean
}

const ProductSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, default: 'piece' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Product = models.Product || model<IProductDocument>('Product', ProductSchema)
export default Product
