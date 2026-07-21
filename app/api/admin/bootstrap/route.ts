import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import type { Role } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// ============================================================================
// PRODUCTION ROLE → EMAIL MAPPING — set 2026-07-21. `role` must be one of the
// Role values in lib/constants.ts (admin, sales, creative, operations,
// accounting) — that's the single source of truth ROLE_PERMISSIONS/
// ROLE_DEFAULT_REDIRECT read from, so any role assigned here automatically
// gets the right module access and post-login redirect with no other code
// changes. 'operations' covers both the Production floor queue and the
// Shipping/dispatch queue (merged from the former separate 'production' and
// 'shipping' roles).
//
// Vaishnavi's 5 "-tester" entries use Gmail/Google-Workspace-style '+'
// sub-addressing (vaishnavi.shivhare+role@eagleeyedigital.io) so one real
// inbox can hold 5 distinct logins, one per role — the User.email field is
// unique, so the same literal address cannot back 5 separate accounts.
// CONFIRM eagleeyedigital.io actually supports '+' addressing (standard on
// Google Workspace/Gmail) before relying on this — if it doesn't, mail to
// these addresses won't be delivered to her inbox and she won't receive
// OTP/password-reset emails sent to them.
//
// `password` is only the ONE-TIME initial password — it's bcrypt-hashed by
// User's pre('save') hook the moment this runs (same hook every other
// password path uses), never stored or logged in plaintext by the app. It
// IS in this source file in plaintext, though — that's the pre-existing,
// deliberate design of this route (see git history), not something new. If
// this repo is or ever becomes non-private, treat these 10 passwords as
// burned the moment this file is committed and have every one of these users
// change their password (Settings) or go through Forgot Password on first
// login rather than keep the one assigned here.
//
// How to run this safely in production:
//   1. Set ADMIN_BOOTSTRAP_TOKEN in your production environment variables
//      (Vercel Project Settings → Environment Variables) — a long random
//      string, not something guessable.
//   2. POST to /api/admin/bootstrap with header
//      `x-bootstrap-token: <that same value>`. Any request without the
//      exact token gets a 404 (the route hides its own existence).
//   3. Existing emails are skipped (status: 'exists'), so it's safe to call
//      again after adding more people to this list — it never overwrites
//      an existing user's password or role.
//   4. Consider unsetting ADMIN_BOOTSTRAP_TOKEN after your real team is
//      fully seeded, so the route goes back to returning 404 for everyone.
// ============================================================================
const DEMO_USERS: Array<{ name: string; email: string; password: string; role: Role; phone: string }> = [
  { name: 'Admin', email: 'bloopersstore@gmail.com', password: 'WuMsa5cst2=*c*!+', role: 'admin', phone: '' },
  { name: 'Vaishnavi Shivhare (Admin - Tester)', email: 'vaishnavi.shivhare+admin@eagleeyedigital.io', password: 'K+W3fnpn6DeE^MKS', role: 'admin', phone: '' },

  { name: 'Operations', email: 'ordersbloopers@gmail.com', password: 'C8u5YeC#7Fr9Jm!U', role: 'operations', phone: '' },
  { name: 'Vaishnavi Shivhare (Operations - Tester)', email: 'vaishnavi.shivhare+operations@eagleeyedigital.io', password: 'Rcn7x=hn^BWu6v!_', role: 'operations', phone: '' },

  { name: 'Sales', email: 'officialbloopersstore@gmail.com', password: 'Bge6sZ&7ZwV2U3@h', role: 'sales', phone: '' },
  { name: 'Vaishnavi Shivhare (Sales - Tester)', email: 'vaishnavi.shivhare+sales@eagleeyedigital.io', password: 'My5k%NM=yJixsR3d', role: 'sales', phone: '' },

  { name: 'Accounting', email: 'accounts@bloopersstore.in', password: 'z=jWStB8Ft8V-c7m', role: 'accounting', phone: '' },
  { name: 'Vaishnavi Shivhare (Accounting - Tester)', email: 'vaishnavi.shivhare+accounting@eagleeyedigital.io', password: 'Gca8w*_A7zN362Z#', role: 'accounting', phone: '' },

  { name: 'Design & Creative', email: 'bloopersdesign@gmail.com', password: 'Uf4_6bLNKp6-qUm8', role: 'creative', phone: '' },
  { name: 'Vaishnavi Shivhare (Creative - Tester)', email: 'vaishnavi.shivhare+creative@eagleeyedigital.io', password: 'Kn+5#pJ-myBk55EP', role: 'creative', phone: '' },
]

function tokensMatch(provided: string, expected: string): boolean {
  // Hash both sides to a fixed 32-byte digest before comparing so
  // timingSafeEqual never sees mismatched lengths (which would throw) and
  // the header value's length can't leak through response timing.
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN
  if (!expected) return false
  const provided = req.headers.get('x-bootstrap-token')
  if (!provided) return false
  return tokensMatch(provided, expected)
}

/**
 * One-time-use admin/demo user bootstrap for production, where public
 * seeding (POST /api/seed) is intentionally disabled. Inert unless
 * ADMIN_BOOTSTRAP_TOKEN is set, and requires that exact value in the
 * `x-bootstrap-token` header. Returns 404 (not 401/403) for any
 * unauthorized request so the route's existence isn't disclosed.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_BOOTSTRAP_TOKEN) {
    console.error('[bootstrap] Blocked — ADMIN_BOOTSTRAP_TOKEN is not set, refusing to run')
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  if (!isAuthorized(req)) {
    console.warn('[bootstrap] Rejected request with missing/invalid x-bootstrap-token header')
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  try {
    await connectDB()

    const results: Array<{ email: string; role: Role; status: 'created' | 'exists' }> = []
    for (const u of DEMO_USERS) {
      const existing = await User.findOne({ email: u.email })
      if (existing) {
        results.push({ email: u.email, role: u.role, status: 'exists' })
        continue
      }
      // User.create() runs the schema's pre('save') hook, so the password
      // is bcrypt-hashed exactly like every other user-creation path.
      await User.create({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        phone: u.phone,
        isActive: true,
      })
      results.push({ email: u.email, role: u.role, status: 'created' })
    }

    const createdCount = results.filter((r) => r.status === 'created').length
    console.log(
      `[bootstrap] Completed: ${createdCount} user(s) created, ${results.length - createdCount} already existed`
    )

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('[bootstrap] Failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Bootstrap failed — check server logs' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_BOOTSTRAP_TOKEN || !isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({
    message: 'POST to this endpoint with the same x-bootstrap-token header to create the demo/admin users.',
  })
}
