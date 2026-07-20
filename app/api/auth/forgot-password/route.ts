import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import PasswordResetToken from '@/models/PasswordResetToken'
import { forgotPasswordSchema } from '@/validations/auth.schema'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendMail } from '@/lib/mailer'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const OTP_TTL_MS = 10 * 60 * 1000

// Always returns this same generic message, whether or not the email
// belongs to an account — the response must not leak which emails exist.
const GENERIC_MESSAGE = 'If an account exists for that email, a verification code has been sent.'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase()

  const ip = getClientIp(req)
  const ipAllowed = await checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`forgot:${email}`, 3, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    await connectDB()

    const user = await User.findOne({ email, isActive: true })
    if (user) {
      // Invalidate any previous outstanding codes for this user before
      // issuing a new one, so only the most recent OTP is ever valid.
      await PasswordResetToken.updateMany({ user: user._id, used: false }, { used: true })

      const otp = generateOtp()
      const otpHash = await hashOtp(otp)
      await PasswordResetToken.create({
        user: user._id,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      })

      await sendMail({
        to: user.email,
        subject: 'Your password reset code',
        text: `Your verification code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      })
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
  } catch (err) {
    console.error('[auth] Forgot-password error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
