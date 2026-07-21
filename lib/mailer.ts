import nodemailer, { type Transporter } from 'nodemailer'
import { getMailConfig, type SmtpConfig } from './mail-config'

interface MailMessage {
  to: string
  subject: string
  text: string
}

// Cached like lib/db.ts's Mongoose connection — a Transporter pools its own
// SMTP connections, so it must be reused across requests/invocations rather
// than rebuilt every call.
let cachedTransporter: Transporter | null = null
let cachedHost: string | null = null

function getTransporter(smtp: SmtpConfig): Transporter {
  if (cachedTransporter && cachedHost === smtp.host) return cachedTransporter
  cachedTransporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  })
  cachedHost = smtp.host
  return cachedTransporter
}

const MAX_ATTEMPTS = 2

async function sendViaSmtp(smtp: SmtpConfig, from: string, message: MailMessage): Promise<boolean> {
  const transporter = getTransporter(smtp)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await transporter.sendMail({ from, to: message.to, subject: message.subject, text: message.text })
      return true
    } catch (err) {
      console.error(
        `[mailer] SMTP send to ${message.to} failed (attempt ${attempt}/${MAX_ATTEMPTS}):`,
        err instanceof Error ? err.message : err
      )
    }
  }
  return false
}

/**
 * Sends transactional email (OTP codes today, reusable for any future
 * notification). Deliberately never throws: a provider outage turning into
 * a thrown error would surface as a 500 instead of the caller's normal
 * response, which for an auth-adjacent endpoint could leak information
 * through the difference. Callers log delivery failures themselves instead.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const config = getMailConfig()

  if (config.provider === 'smtp' && config.smtp) {
    const delivered = await sendViaSmtp(config.smtp, config.from, message)
    if (delivered) return

    // In production, never fall through to logging the message body below —
    // that body carries the OTP/reset content, and stdout in production is
    // typically shipped to a log aggregator other people can read. Losing
    // the email silently (but loudly in the error log) is safer than
    // leaking the code to anyone with log access.
    if (process.env.NODE_ENV === 'production') {
      console.error(`[mailer] Giving up on ${message.to} after ${MAX_ATTEMPTS} failed SMTP attempts`)
      return
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.error(
      '[mailer] No mail provider configured in production (SMTP_HOST/SMTP_USER/SMTP_PASS are unset) — email not sent. See .env.local for the variables to set.'
    )
    return
  }

  // Dev-only fallback (also reached in dev when SMTP isn't configured yet,
  // and as a same-process retry-exhausted fallback in dev only).
  console.log(`[mailer:dev] To: ${message.to} | Subject: ${message.subject}\n${message.text}`)
}
