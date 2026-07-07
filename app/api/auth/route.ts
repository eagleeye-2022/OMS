import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import { signToken, verifyToken, SESSION_COOKIE } from '@/lib/auth'
import User from '@/models/User'

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
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
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
