import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

// Login itself doesn't happen here — the app is passwordless, two-step
// email + OTP (see /api/auth/request-login-otp and
// /api/auth/verify-login-otp, which mints the session cookie). This route
// only reads the session (GET, polled by useAuth()) and logs out (DELETE).
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
