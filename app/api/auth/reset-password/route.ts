import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import PasswordResetToken from '@/models/PasswordResetToken'
import { resetPasswordSchema } from '@/validations/auth.schema'
import { compareOtp } from '@/lib/otp'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const MAX_ATTEMPTS = 5

// Same wording/rationale as app/api/auth/verify-otp/route.ts — keep both in
// sync if this ever changes.
const NO_ACTIVE_CODE = 'Invalid or expired code. Please request a new code.'
const EXPIRED = 'This code has expired. Please request a new one.'
const LOCKED_OUT = 'Too many incorrect attempts. Please request a new code.'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase()
  const { otp, password } = parsed.data

  const ip = getClientIp(req)
  const ipAllowed = await checkRateLimit(`reset:${ip}`, 10, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`reset:${email}`, 8, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  try {
    await connectDB()

    const user = await User.findOne({ email, isActive: true }).select('+password')
    if (!user) {
      return NextResponse.json({ success: false, error: NO_ACTIVE_CODE }, { status: 400 })
    }

    const token = await PasswordResetToken.findOne({ user: user._id, used: false }).sort({ createdAt: -1 })
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
      const remaining = MAX_ATTEMPTS - token.attempts
      return NextResponse.json(
        {
          success: false,
          error: remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` : LOCKED_OUT,
        },
        { status: 400 }
      )
    }

    user.password = password
    await user.save()

    // Only one unused+unexpired token can exist per user at a time (each
    // forgot-password request invalidates the previous one), but this stays
    // defensive in case that ever changes.
    await PasswordResetToken.updateMany({ user: user._id, used: false }, { used: true })

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('[auth] Reset-password error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
