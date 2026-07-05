import { z } from 'zod'

export const orderSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  category: z.string().min(1, 'Category is required'),
  productType: z.string().min(1, 'Product type is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  sizeBreakdown: z.string().optional(),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  totalAmount: z.number().positive('Total order value is required and must be greater than 0'),
  advancePaid: z.number().min(0).default(0),
})

export type OrderInput = z.infer<typeof orderSchema>

/** "Edit Details" — sales/admin editing core order specs after creation. */
export const updateOrderCoreSchema = z.object({
  category: z.string().min(1, 'Category is required').optional(),
  productType: z.string().min(1, 'Product type is required').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
  sizeBreakdown: z.string().optional(),
  deliveryDate: z.string().min(1).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
})

export const updateDesignStatusSchema = z.object({
  designStatus: z.enum(['pending', 'in_progress', 'in_review', 'revision_requested', 'client_approved', 'rejected']),
  creativeRemarks: z.string().optional(),
  revisionNote: z.string().optional(),
})

export const updateProductionStageSchema = z.object({
  productionStage: z.enum(['printing', 'stitching', 'finishing', 'quality_check', 'completed']),
  productionRemarks: z.string().optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending', 'design_review', 'design_approved', 'in_production',
    'quality_check', 'shipping_ready', 'dispatched', 'in_transit',
    'delivered', 'cancelled', 'delayed',
  ]),
  revisionNote: z.string().optional(),
  delayReason: z.string().optional(),
})

export const orderNoteSchema = z.object({
  text: z.string().min(1, 'Note text is required'),
  noteType: z.enum(['general', 'creative', 'production', 'shipping', 'accounts']).optional(),
})

export const orderAssetSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().min(1, 'URL is required'),
  kind: z.enum(['drive_link', 'file']),
  mimeType: z.string().optional(),
  size: z.number().optional(),
})

export const assignTeamSchema = z.object({
  salesExecutive: z.string().optional().or(z.literal('')),
  creativeExecutive: z.string().optional().or(z.literal('')),
  productionManager: z.string().optional().or(z.literal('')),
})

/** Structured per-stage progress update — one named stage per request. */
export const updateProductionStageProgressSchema = z.object({
  stage: z.enum(['printing', 'stitching', 'finishing', 'qcCheck']),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  unitsCompleted: z.coerce.number().min(0).optional(),
  totalUnits: z.coerce.number().min(0).optional(),
  workerName: z.string().optional(),
  note: z.string().optional(),
})

/** Courier/tracking assignment — also auto-dispatches a 'shipping_ready' order. */
export const updateShippingDetailsSchema = z.object({
  courierPartner: z.string().min(1, 'Courier is required'),
  trackingNumber: z.string().optional(),
  dispatchDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  shipmentWeight: z.coerce.number().min(0).optional(),
  packageCount: z.coerce.number().min(0).optional(),
})

/**
 * Invoice upsert — partial merge onto order.invoice. All fields optional here
 * since the same route also serves narrow single-field updates (e.g. just
 * toggling sentToClient from the preview panel); the route itself requires
 * invoiceNumber + amount when creating the invoice for the first time.
 */
export const upsertInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  invoiceType: z.enum(['tax_invoice', 'proforma_invoice', 'receipt']).optional(),
  invoiceDate: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  cgstPercent: z.coerce.number().min(0).max(100).optional(),
  sgstPercent: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.coerce.number().min(0).optional(),
  isFinal: z.boolean().optional(),
  sentToClient: z.boolean().optional(),
})

/** Overdue payment reminder — simulated (logged) since no email/WhatsApp dispatch infra exists in this codebase. */
export const paymentReminderSchema = z.object({
  channels: z.object({
    email: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    internal: z.boolean().optional(),
  }),
  escalationNote: z.string().optional(),
})
