import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import type { Role } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Same demo/admin accounts app/api/seed/route.ts creates locally — kept here
// as a self-contained literal (rather than imported) so this route has no
// dependency on the dev-only seed script ever changing shape.
const DEMO_USERS: Array<{ name: string; email: string; password: string; role: Role; phone: string }> = [
  { name: 'Aryan Mehta', email: 'admin@untitledstore.com', password: 'Admin@123', role: 'admin', phone: '9876543210' },
  { name: 'Priya Sharma', email: 'sales@untitledstore.com', password: 'Sales@123', role: 'sales', phone: '9876543211' },
  { name: 'Vaishnavi Shivhare', email: 'creative@untitledstore.com', password: 'Creative@123', role: 'creative', phone: '9876543212' },
  { name: 'Rahul Verma', email: 'production@untitledstore.com', password: 'Prod@123', role: 'production', phone: '9876543213' },
  { name: 'Sanjay Kumar', email: 'shipping@untitledstore.com', password: 'Ship@123', role: 'shipping', phone: '9876543214' },
  { name: 'Neha Gupta', email: 'accounts@untitledstore.com', password: 'Acc@123', role: 'accounts', phone: '9876543215' },
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
