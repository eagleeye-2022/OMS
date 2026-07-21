import { z } from 'zod'

// Login is passwordless (email + OTP only, since 2026-07-21) — the only
// auth flow in this app. These two schemas back /api/auth/request-login-otp
// and /api/auth/verify-login-otp.
export const requestLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const verifyLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})
