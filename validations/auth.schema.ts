import { z } from 'zod'
import { ROLES } from '@/lib/constants'

// Login is passwordless (email + OTP only, since 2026-07-21) — the only
// auth flow in this app. These two schemas back /api/auth/request-login-otp
// and /api/auth/verify-login-otp.
//
// `testRole` is optional and only meaningful for the handful of tester
// emails in lib/testers.ts — it's what the /tester-login role picker sends
// to ask for a session role other than the account's own DB role. Anyone
// else's testRole is rejected server-side (see resolveSessionRole in both
// routes); it is never trusted just because it parsed.
const testRoleSchema = z.enum([ROLES.ADMIN, ROLES.SALES, ROLES.CREATIVE, ROLES.OPERATIONS, ROLES.ACCOUNTING]).optional()

export const requestLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  testRole: testRoleSchema,
})

export const verifyLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  testRole: testRoleSchema,
})
