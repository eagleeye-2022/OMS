import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['admin', 'sales', 'creative', 'operations', 'accounting']),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type UserInput = z.infer<typeof userSchema>
