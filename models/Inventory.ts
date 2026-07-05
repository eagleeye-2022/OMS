import { Schema, Document, model, models, Types } from 'mongoose'

export interface IInventoryDocument extends Document {
  product: Types.ObjectId
  material: string
  quantity: number
  unit: string
  reorderLevel: number
  lastUpdated: Date
}

const InventorySchema = new Schema<IInventoryDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    material: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    reorderLevel: { type: Number, required: true, default: 10 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const Inventory = models.Inventory || model<IInventoryDocument>('Inventory', InventorySchema)
export default Inventory
