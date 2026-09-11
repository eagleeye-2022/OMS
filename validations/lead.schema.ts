import { z } from 'zod'
import { LEAD_STATUS_VALUES, LEAD_MANUAL_ACTIVITY_TYPES } from '@/lib/constants'

const assetFileSchema = z.object({
  url: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedAt: z.string().optional(),
})

const linkSchema = z.object({
  label: z.string().min(1, 'Link label is required'),
  url: z.url('Must be a valid URL'),
})

const LEAD_STATUS_ENUM = z.enum(LEAD_STATUS_VALUES as [string, ...string[]])
const LEAD_PAYMENT_STATUS_ENUM = z.enum(['pending', 'partially_paid', 'paid', 'refunded', 'failed'])

export const leadSchema = z.object({
  name: z.string().min(2, 'Lead name must be at least 2 characters'),
  companyName: z.string().optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  countryCode: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  status: LEAD_STATUS_ENUM.optional(),
  productType: z.string().min(1, 'Product type is required'),
  closingDate: z.string().optional().or(z.literal('')),
  quantity: z.coerce.number().int().positive('Quantity must be a positive number'),
  amount: z.coerce.number().min(0).optional(),
  paymentStatus: LEAD_PAYMENT_STATUS_ENUM.optional(),
  specialRequirements: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  preferredContactTime: z.string().optional().or(z.literal('')),
  assignedTo: z.string().optional().or(z.literal('')),
  attachments: z.array(assetFileSchema).optional(),
  links: z.array(linkSchema).optional(),
})

export type LeadInput = z.infer<typeof leadSchema>

export const leadStatusSchema = z.object({
  status: LEAD_STATUS_ENUM,
})

export const leadActivitySchema = z.object({
  type: z.enum(LEAD_MANUAL_ACTIVITY_TYPES as [string, ...string[]]),
  title: z.string().min(1, 'Title is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  description: z.string().optional().or(z.literal('')),
})

export const leadAttachmentSchema = z.object({
  kind: z.enum(['file', 'link']),
  file: assetFileSchema.optional(),
  link: linkSchema.optional(),
})
