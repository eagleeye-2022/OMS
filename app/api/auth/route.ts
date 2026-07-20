import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { signToken, verifyToken, SESSION_COOKIE } from '@/lib/auth'
import User from '@/models/User'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
  const user = verifyToken(token)
  if (!user) return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
  return NextResponse.json({ success: true, data: user })
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
  }

  const ip = getClientIp(req)
  const normalizedEmail = email.toLowerCase()
  const ipAllowed = await checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`login:${normalizedEmail}`, 5, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many login attempts. Please try again later.' }, { status: 429 })
  }

  try {
    await connectDB()
  } catch (err) {
    // Distinct log tag from the "Invalid credentials" path below, so a
    // misconfigured MONGODB_URI/DB outage doesn't get mistaken for someone
    // just typing the wrong password.
    console.error('[auth] Login failed — database unavailable:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Service temporarily unavailable' }, { status: 503 })
  }

  try {
    const user = await User.findOne({ email: normalizedEmail, isActive: true }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      console.warn(JSON.stringify({ event: 'login_failed', email: normalizedEmail, ip }))
      return NextResponse.json({ success: false, error: 'Incorrect email or password' }, { status: 401 })
    }

    const sessionUser = { id: user._id.toString(), name: user.name, email: user.email, role: user.role }
    const token = signToken(sessionUser)

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({ success: true, data: sessionUser })
  } catch (err) {
    console.error('[auth] Login error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  return NextResponse.json({ success: true })
}
