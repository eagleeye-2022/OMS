export type MailProvider = 'smtp' | 'console'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
}

export interface MailConfig {
  provider: MailProvider
  from: string
  smtp: SmtpConfig | null
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
  }
}

// Single point of truth for outbound mail config — see .env.local for the
// exact variable names to set (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/
// SMTP_SECURE/MAIL_FROM). Works with any SMTP-speaking provider (Resend,
// SendGrid, Postmark, Mailgun, SES, Google Workspace, etc.) — nothing here
// is vendor-specific.
export function getMailConfig(): MailConfig {
  const smtp = readSmtpConfig()
  const explicitProvider = process.env.MAIL_PROVIDER as MailProvider | undefined

  // MAIL_PROVIDER=console forces the dev-style console log even if SMTP_*
  // happens to be set (useful for staging environments that shouldn't send
  // real mail). Otherwise the provider is auto-detected from SMTP_* being
  // present, so most deployments never need to set MAIL_PROVIDER at all.
  const provider: MailProvider = explicitProvider === 'console' ? 'console' : smtp ? 'smtp' : 'console'

  return {
    provider,
    from: process.env.MAIL_FROM || 'The Untitled Store <no-reply@untitledstore.com>',
    smtp,
  }
}
