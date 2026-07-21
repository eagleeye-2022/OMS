import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import OtpToken from '@/models/OtpToken'
import { requestLoginOtpSchema } from '@/validations/auth.schema'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendMail } from '@/lib/mailer'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const OTP_TTL_MS = 10 * 60 * 1000

// Deliberately NOT the generic "if an account exists..." wording
// forgot-password uses — this is a closed, internal-team system with a
// small, fixed roster of assigned emails, and the product requirement here
// is an explicit, unambiguous rejection so someone who mistypes their
// address (or tries a personal one instead of their work one) finds out
// immediately, instead of waiting for a code that will never arrive.
// Trade-off: this endpoint can be used to enumerate which emails are
// provisioned. Mitigated, not eliminated, by the same per-email/per-IP rate
// limits below (identical to forgot-password's).
const NOT_AUTHORIZED = 'This email is not authorized for OMS.'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestLoginOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase()

  const ip = getClientIp(req)
  const ipAllowed = await checkRateLimit(`login-otp-request:${ip}`, 5, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`login-otp-request:${email}`, 3, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    await connectDB()

    const user = await User.findOne({ email, isActive: true })
    if (!user) {
      console.warn(JSON.stringify({ event: 'login_otp_rejected', reason: 'unauthorized_email', email, ip }))
      return NextResponse.json({ success: false, error: NOT_AUTHORIZED }, { status: 403 })
    }

    // Invalidate any previous outstanding login codes for this user before
    // issuing a new one, so only the most recent OTP is ever valid.
    await OtpToken.updateMany({ user: user._id, used: false, purpose: 'login' }, { used: true })

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    await OtpToken.create({
      user: user._id,
      purpose: 'login',
      otpHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    })

    await sendMail({
      to: user.email,
      subject: 'Your OMS login code',
      text: `Your login code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    })

    return NextResponse.json({ success: true, message: 'A login code has been sent to your email.' })
  } catch (err) {
    console.error('[auth] Request-login-otp error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
