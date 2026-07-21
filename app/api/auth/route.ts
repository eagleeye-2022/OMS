import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

// Login itself no longer happens here — it's passwordless, two-step email +
// OTP now (see /api/auth/request-login-otp and /api/auth/verify-login-otp,
// the latter of which mints the same session cookie this route used to mint
// on a successful password check). This route keeps only session read
// (GET, polled by useAuth()) and logout (DELETE) — both OTP-agnostic, since
// a session cookie looks the same regardless of how it was obtained.
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  const user = verifyToken(token)
  if (!user) return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
  return NextResponse.json({ success: true, data: user })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  return NextResponse.json({ success: true })
}
