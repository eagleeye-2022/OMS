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
