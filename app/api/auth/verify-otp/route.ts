import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import PasswordResetToken from '@/models/PasswordResetToken'
import { verifyOtpSchema } from '@/validations/auth.schema'
import { compareOtp } from '@/lib/otp'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const MAX_ATTEMPTS = 5

// Identical wording for "no such account" and "account exists but has no
// active code" — the boundary where email existence must never leak is
// forgot-password (always generic there). Past that point the caller is
// assumed to be mid-flow with a real code in hand, so "expired"/"too many
// attempts"/"remaining attempts" are shown for usability, matching common
// OTP UX (Google/GitHub/etc.) — a deliberate, narrower tradeoff than the
// enumeration-proofing forgot-password does.
const NO_ACTIVE_CODE = 'Invalid or expired code. Please request a new code.'
const EXPIRED = 'This code has expired. Please request a new one.'
const LOCKED_OUT = 'Too many incorrect attempts. Please request a new code.'

export async function POST(req: NextRequest) {
  let body: { email?: string; otp?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = verifyOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase()
  const { otp } = parsed.data

  const ip = getClientIp(req)
  const ipAllowed = await checkRateLimit(`verify-otp:${ip}`, 10, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`verify-otp:${email}`, 8, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  try {
    await connectDB()

    const user = await User.findOne({ email, isActive: true })
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

    // Deliberately does not mark the token used — this endpoint only gives
    // the Verification screen pass/fail feedback. The token is consumed at
    // /api/auth/reset-password, which re-validates the OTP before applying
    // the new password.
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[auth] Verify-OTP error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
