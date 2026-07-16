import { z } from 'zod'

export const paymentSchema = z.object({
  order: z.string().min(1, 'Order is required'),
  client: z.string().min(1, 'Client is required'),
  amount: z.number().min(1, 'Amount must be at least ₹1'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  invoiceUrl: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>

/**
 * Correction-only edit of an existing payment receipt — deliberately
 * excludes `order`/`client`/`amount`/`receiptNumber`/`recordedBy`. `amount`
 * in particular must never be editable here: POST /api/payments recomputes
 * the linked Order's advancePaid/balanceDue/paymentStatus at creation time,
 * and this route has no equivalent recompute step, so changing amount here
 * would silently desync the payment ledger from the order's derived totals.
 */
export const paymentCorrectionSchema = z.object({
  paymentDate: z.string().min(1).optional(),
  method: z.string().min(1).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})
