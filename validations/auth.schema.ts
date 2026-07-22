import { z } from 'zod'
import { ROLES } from '@/lib/constants'

// Login is passwordless (email + OTP only, since 2026-07-21) — the only
// auth flow in this app. These two schemas back /api/auth/request-login-otp
// and /api/auth/verify-login-otp.
//
// `testRole` is optional and only meaningful for the handful of tester
// emails in lib/testers.ts — it's what the /tester-login role picker sends
// to ask for a session role other than the account's own DB role. Anyone
// else's testRole is rejected server-side (see getTesterAllowedRoles usage
// in both routes); it is never trusted just because it parsed.
//
// `selectedRole` is the production-/login counterpart, added 2026-07-22 —
// it's what the /login role picker sends to state which role the user
// intends to enter as. Unlike testRole, it never overrides the session
// role; it's purely a pre-flight "does this match your real DB role"
// check, enforced in both routes. A mismatch is a hard rejection (no OTP
// sent / no session minted), never a silent fallback — production accounts
// have exactly one true role, so there is nothing to gracefully degrade to.
// The two fields are independent and mutually exclusive in practice
// (/login only ever sends selectedRole, /tester-login only ever sends
// testRole) but both are validated whenever present, regardless of source.
const roleFieldSchema = z.enum([ROLES.ADMIN, ROLES.SALES, ROLES.CREATIVE, ROLES.OPERATIONS, ROLES.ACCOUNTING]).optional()

export const requestLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  testRole: roleFieldSchema,
  selectedRole: roleFieldSchema,
})

export const verifyLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  testRole: roleFieldSchema,
  selectedRole: roleFieldSchema,
})
