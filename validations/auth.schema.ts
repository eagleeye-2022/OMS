import { z } from 'zod'

// Login is passwordless (email + OTP only, since 2026-07-21) — these two
// schemas back /api/auth/request-login-otp and /api/auth/verify-login-otp.
// Kept as their own named schemas (rather than reusing forgotPasswordSchema/
// verifyOtpSchema below, which are byte-identical in shape) so each route's
// import makes its purpose obvious and the login and password-reset flows
// can't be confused for one another at a glance.
export const requestLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const verifyLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/[0-9]/, 'Password must include a number')

export const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
