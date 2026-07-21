import { z } from 'zod'

// No password field — login is passwordless (email + OTP only). Creating or
// editing a user never involves a credential, just identity + role.
export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'sales', 'creative', 'operations', 'accounting']),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type UserInput = z.infer<typeof userSchema>
