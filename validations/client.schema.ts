import { z } from 'zod'

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

const optionalUrl = z.url('Must be a valid URL').optional().or(z.literal(''))

const addressSchema = z.object({
  pinCode: z.string().min(1, 'PIN code is required'),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  landmark: z.string().optional().or(z.literal('')),
})

const partialAddressSchema = z.object({
  pinCode: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  landmark: z.string().optional().or(z.literal('')),
})

const assetFileSchema = z.object({
  url: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedAt: z.string().optional(),
})

const escalationContactSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  email: z.string().email('Invalid escalation email'),
  mobileNumber: z.string().min(10, 'Mobile number is required'),
  address: z.string().min(1, 'Address is required'),
})

const partialEscalationContactSchema = z.object({
  recipientName: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid escalation email').optional().or(z.literal('')),
  mobileNumber: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
})

const productPreferenceSchema = z.object({
  preferredProductCategory: z.string().min(1, 'Preferred product category is required'),
  orderQuantity: z.coerce.number().int().positive('Order quantity must be a positive number'),
  orderNote: z.string().min(1, 'Order note is required'),
})

const PAYMENT_TERMS_VALUES = [
  'custom', '100_advance', '75_advance_balance_dispatch',
  '50_advance_balance_dispatch', '50_advance_balance_delivery',
  '30_days_credit', '45_days_credit',
] as const

/**
 * Lenient schema used whenever a client is being saved with status !== 'active'
 * (i.e. "Save as Draft" / step "Save & Continue" mid-wizard). Only companyName
 * is required so a row can be created and given an _id after Step 1.
 */
export const clientDraftSchema = z.object({
  companyName: z.string().min(2, 'Client / Company name must be at least 2 characters'),
  clientType: z.enum(['individual', 'corporate']).optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  contactPersonName: z.string().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  alternatePhone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  sameAsBilling: z.boolean().optional(),
  billingAddress: partialAddressSchema.optional(),
  shippingAddress: partialAddressSchema.optional(),
  gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().or(z.literal('')),
  defaultAdvanceRequirement: z.coerce.number().min(0).max(100).optional(),
  defaultPaymentTerms: z.enum(PAYMENT_TERMS_VALUES).optional().or(z.literal('')),
  customPaymentTerms: z.string().optional().or(z.literal('')),
  preferredPaymentMode: z.enum(['bank_transfer', 'upi', 'cheque', 'cash']).optional().or(z.literal('')),
  invoiceRecipientName: z.string().optional().or(z.literal('')),
  invoiceEmail: z.string().email('Invalid invoice email').optional().or(z.literal('')),
  deliveryDate: z.string().optional().or(z.literal('')),
  escalationContact: partialEscalationContactSchema.optional(),
  assets: z.object({
    companyLogo: assetFileSchema.optional(),
    brandGuidelines: assetFileSchema.optional(),
    artworkReferences: assetFileSchema.optional(),
    previousDesigns: assetFileSchema.optional(),
  }).optional(),
  sharedLinks: z.object({
    googleDriveFolder: optionalUrl,
    dropboxFolder: optionalUrl,
    websiteUrl: optionalUrl,
    socialMedia: optionalUrl,
  }).optional(),
  productPreferences: z.array(z.object({
    preferredProductCategory: z.string().optional().or(z.literal('')),
    orderQuantity: z.coerce.number().optional(),
    orderNote: z.string().optional().or(z.literal('')),
  })).optional(),
  notes: z.string().optional().or(z.literal('')),
})

export type ClientDraftInput = z.infer<typeof clientDraftSchema>

/**
 * Strict schema used for the final "Save Client" submit (status becomes 'active').
 * Enforces every field marked required (*) in the design across all 3 steps.
 */
export const clientSchema = z
  .object({
    companyName: z.string().min(2, 'Client / Company name must be at least 2 characters'),
    clientType: z.enum(['individual', 'corporate']),
    status: z.enum(['draft', 'active', 'inactive']).optional(),
    contactPersonName: z.string().min(1, 'Contact person name is required'),
    designation: z.string().optional().or(z.literal('')),
    phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
    alternatePhone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address'),
    sameAsBilling: z.boolean(),
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().or(z.literal('')),
    defaultAdvanceRequirement: z.coerce.number().min(0).max(100).optional(),
    defaultPaymentTerms: z.enum(PAYMENT_TERMS_VALUES).optional(),
    customPaymentTerms: z.string().optional().or(z.literal('')),
    preferredPaymentMode: z.enum(['bank_transfer', 'upi', 'cheque', 'cash']).optional(),
    invoiceRecipientName: z.string().min(1, 'Invoice recipient name is required'),
    invoiceEmail: z.string().email('Invalid invoice email'),
    deliveryDate: z.string().min(1, 'Delivery date is required'),
    escalationContact: escalationContactSchema,
    assets: z.object({
      companyLogo: assetFileSchema.optional(),
      brandGuidelines: assetFileSchema.optional(),
      artworkReferences: assetFileSchema.optional(),
      previousDesigns: assetFileSchema.optional(),
    }).optional(),
    sharedLinks: z.object({
      googleDriveFolder: optionalUrl,
      dropboxFolder: optionalUrl,
      websiteUrl: optionalUrl,
      socialMedia: optionalUrl,
    }).optional(),
    productPreferences: z.array(productPreferenceSchema).min(1, 'At least one product preference is required'),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.clientType === 'corporate' && !data.gstNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['gstNumber'],
        message: 'GST number is mandatory for corporate accounts',
      })
    }
    if (data.defaultPaymentTerms === 'custom' && !data.customPaymentTerms) {
      ctx.addIssue({
        code: 'custom',
        path: ['customPaymentTerms'],
        message: 'Custom payment terms are required when "Custom" is selected',
      })
    }
  })

export type ClientInput = z.infer<typeof clientSchema>

export const clientStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
})

/**
 * Per-step "Continue" gating schemas used client-side by the wizard, independent
 * from the draft/final persistence schemas above. These enforce exactly the
 * fields marked required (*) on each step of the design, regardless of whether
 * the record is ultimately persisted as draft or active.
 */
export const clientStep1Schema = z.object({
  companyName: z.string().min(2, 'Client name is required'),
  contactPersonName: z.string().min(1, 'Contact person name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('A valid email address is required'),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
})

export const clientStep2Schema = z
  .object({
    clientType: z.enum(['individual', 'corporate']),
    gstNumber: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().or(z.literal('')),
    defaultPaymentTerms: z.enum(PAYMENT_TERMS_VALUES).optional().or(z.literal('')),
    customPaymentTerms: z.string().optional().or(z.literal('')),
    invoiceRecipientName: z.string().min(1, 'Invoice recipient name is required'),
    invoiceEmail: z.string().email('A valid invoice email is required'),
    escalationContact: escalationContactSchema,
  })
  .superRefine((data, ctx) => {
    if (data.clientType === 'corporate' && !data.gstNumber) {
      ctx.addIssue({ code: 'custom', path: ['gstNumber'], message: 'GST number is mandatory for corporate accounts' })
    }
    if (data.defaultPaymentTerms === 'custom' && !data.customPaymentTerms) {
      ctx.addIssue({ code: 'custom', path: ['customPaymentTerms'], message: 'Custom payment terms are required when "Custom" is selected' })
    }
  })

export const clientStep3Schema = z.object({
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  productPreferences: z.array(productPreferenceSchema).min(1, 'At least one product preference is required'),
})
