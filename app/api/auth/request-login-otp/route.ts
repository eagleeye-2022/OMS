import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import OtpToken from '@/models/OtpToken'
import { requestLoginOtpSchema } from '@/validations/auth.schema'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendMail } from '@/lib/mailer'
import { getMailConfig } from '@/lib/mail-config'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getTesterAllowedRoles } from '@/lib/testers'

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
  const { testRole, selectedRole } = parsed.data

  const ip = getClientIp(req)
  // ip === 'unknown' means neither x-forwarded-for nor x-real-ip was
  // present on the request — behind a reverse proxy (nginx on the VPS) that
  // doesn't forward the client's address, EVERY visitor collapses onto the
  // same 'unknown' rate-limit bucket, so one person's testing can 429
  // everyone else. This log line is what makes that class of incident
  // diagnosable instead of looking like an unexplained "only works for me."
  if (ip === 'unknown') {
    console.warn(JSON.stringify({ event: 'client_ip_unresolved', email, path: 'request-login-otp' }))
  }

  const ipAllowed = await checkRateLimit(`login-otp-request:${ip}`, 5, 15 * 60 * 1000)
  const emailAllowed = await checkRateLimit(`login-otp-request:${email}`, 3, 15 * 60 * 1000)
  if (!ipAllowed || !emailAllowed) {
    return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const mailConfig = getMailConfig()
  // Single structured line per call, independent of outcome — the log line
  // the 2026-07-22 "OTP only works from my system" incident needed from the
  // start: which email/IP asked, what environment/mail-provider answered,
  // filled in below once known (otpGenerated / mail.*).
  const logBase = {
    email,
    ip,
    nodeEnv: process.env.NODE_ENV,
    mailProvider: mailConfig.provider,
    smtpConfigured: mailConfig.diagnostics.smtpConfigured,
  }

  try {
    await connectDB()

    const user = await User.findOne({ email, isActive: true })
    if (!user) {
      console.warn(JSON.stringify({ event: 'login_otp_rejected', reason: 'unauthorized_email', ...logBase }))
      return NextResponse.json({ success: false, error: NOT_AUTHORIZED }, { status: 403 })
    }

    // selectedRole is only ever set by the production /login role picker.
    // Production accounts have exactly one true role (User.role in the DB)
    // — unlike testRole below, a mismatch here is always a hard rejection,
    // never a fallback, because there is no legitimate "lesser" role to
    // silently fall back to for a real business account.
    if (selectedRole && selectedRole !== user.role) {
      console.warn(JSON.stringify({ event: 'role_mismatch_denied', stage: 'request_otp', selectedRole, actualRole: user.role, ...logBase }))
      return NextResponse.json(
        { success: false, error: `This account is not registered for the "${selectedRole}" role. Please select the correct role.` },
        { status: 403 }
      )
    }

    // testRole is only ever set by the /tester-login role picker. Reject
    // here — before an OTP is even sent — if this email isn't an approved
    // tester or hasn't been granted that specific role, so a mismatched
    // pick fails fast instead of burning a code send and a rate-limit slot.
    // This is a convenience check only: verify-login-otp repeats it
    // authoritatively, since that's the call that actually mints a session.
    if (testRole && !getTesterAllowedRoles(email).includes(testRole)) {
      console.warn(JSON.stringify({ event: 'tester_role_denied', stage: 'request_otp', testRole, ...logBase }))
      return NextResponse.json(
        { success: false, error: `This account is not approved to test the "${testRole}" role.` },
        { status: 403 }
      )
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

    const mailResult = await sendMail({
      to: user.email,
      subject: 'Your OMS login code',
      text: `Your login code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    })
    // Never includes the OTP itself — this line answers "did delivery
    // work," not "what was the code." `reason` is the enum from
    // lib/mailer.ts (sent / smtp_error / not_configured / dev_console) so
    // grepping server logs for mailResult.reason!=="sent" finds every real
    // delivery failure without a human having to interpret free-text SMTP
    // errors (those are still logged separately, by sendMail itself).
    console.log(JSON.stringify({ event: 'otp_mail_result', otpGenerated: true, mailResult, ...logBase }))

    // `role` here is always the account's real DB role (never testRole) —
    // it's returned so /login can display "you're logging in as <role>"
    // between requesting and entering the code. Purely informational: it
    // does not grant anything and mirrors what verify-login-otp will return
    // on success anyway, so this discloses nothing verify-login-otp doesn't
    // already reveal one step later for this same already-authorized email.
    return NextResponse.json({ success: true, message: 'A login code has been sent to your email.', role: user.role })
  } catch (err) {
    console.error('[auth] Request-login-otp error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
