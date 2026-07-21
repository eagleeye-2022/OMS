import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import OtpToken from '@/models/OtpToken'
import { verifyLoginOtpSchema } from '@/validations/auth.schema'
import { compareOtp } from '@/lib/otp'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { signToken, SESSION_COOKIE } from '@/lib/auth'

const MAX_ATTEMPTS = 5

// Same rationale as request-login-otp/route.ts for the non-generic wording.
const NOT_AUTHORIZED = 'This email is not authorized for OMS.'
const NO_ACTIVE_CODE = 'Invalid or expired code. Please request a new code.'
const EXPIRED = 'This code has expired. Please request a new one.'
const LOCKED_OUT = 'Too many incorrect attempts. Please request a new code.'

/**
 * Terminal step of passwordless login — validates the code AND mints the
 * session in one call, since this app's only auth flow is email + OTP with
 * no further step after verification.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; otp?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = verifyLoginOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase()
  const { otp } = parsed.data

  const ip = getClientIp(req)
  const ipAllowed = await checkRateLimit(`verify-login-otp:${ip}`, 10, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`verify-login-otp:${email}`, 8, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  try {
    await connectDB()

    const user = await User.findOne({ email, isActive: true })
    if (!user) {
      console.warn(JSON.stringify({ event: 'login_failed', reason: 'unauthorized_email', email, ip }))
      return NextResponse.json({ success: false, error: NOT_AUTHORIZED }, { status: 403 })
    }

    const token = await OtpToken.findOne({ user: user._id, used: false, purpose: 'login' }).sort({ createdAt: -1 })
    if (!token) {
      return NextResponse.json({ success: false, error: NO_ACTIVE_CODE }, { status: 400 })
    }
    if (token.expiresAt <= new Date()) {
      return NextResponse.json({ success: false, error: EXPIRED }, { status: 400 })
    }
    if (token.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ success: false, error: LOCKED_OUT }, { status: 400 })
    }

    const isMatch = await compareOtp(otp, token.otpHash)
    if (!isMatch) {
      token.attempts += 1
      await token.save()
      console.warn(JSON.stringify({ event: 'login_failed', reason: 'bad_otp', email, ip }))
      const remaining = MAX_ATTEMPTS - token.attempts
      return NextResponse.json(
        {
          success: false,
          error: remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : LOCKED_OUT,
        },
        { status: 400 }
      )
    }

    // Unlike the password-reset verify-otp step, login has no further step —
    // this IS the terminal action, so the code must be consumed immediately
    // to prevent replay within its remaining TTL.
    token.used = true
    await token.save()

    const sessionUser = { id: user._id.toString(), name: user.name, email: user.email, role: user.role }
    const sessionToken = signToken(sessionUser)

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({ success: true, data: sessionUser })
  } catch (err) {
    console.error('[auth] Verify-login-otp error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
