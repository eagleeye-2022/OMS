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

// Canonical var name first, EMAIL_* second. The EMAIL_* fallback exists
// because this exact mismatch was a real incident (2026-07-22): .env.local
// and the VPS's .env had EMAIL_HOST/EMAIL_PORT/EMAIL_SECURE/EMAIL_USER
// instead of SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER. Since only
// SMTP_PASS happened to be named correctly, readSmtpConfig() always
// returned null (host/user missing) regardless of MAIL_PROVIDER=smtp being
// set, so getMailConfig() silently fell back to 'console' — which meant
// dev (where the console fallback IS the OTP delivery path — see
// mailer.ts) looked like it worked, while production (which refuses to
// console-log a code — see mailer.ts) silently sent nothing to anyone. Both
// names are accepted going forward so a future env-file typo degrades to a
// clearly-logged mismatch, not a silent, environment-dependent illusion of
// working.
function readEnv(canonical: string, legacy: string): { value: string | undefined; usedLegacy: boolean } {
  const canonicalValue = process.env[canonical]
  if (canonicalValue) return { value: canonicalValue, usedLegacy: false }
  const legacyValue = process.env[legacy]
  return { value: legacyValue, usedLegacy: !!legacyValue }
}

export interface MailConfigDiagnostics {
  provider: MailProvider
  smtpConfigured: boolean
  missingVars: string[]
  usedLegacyVarNames: string[]
}

function readSmtpConfig(): { smtp: SmtpConfig | null; diagnostics: Pick<MailConfigDiagnostics, 'missingVars' | 'usedLegacyVarNames'> } {
  const host = readEnv('SMTP_HOST', 'EMAIL_HOST')
  const user = readEnv('SMTP_USER', 'EMAIL_USER')
  const pass = readEnv('SMTP_PASS', 'EMAIL_PASS')
  const port = readEnv('SMTP_PORT', 'EMAIL_PORT')
  const secure = readEnv('SMTP_SECURE', 'EMAIL_SECURE')

  const usedLegacyVarNames = [
    host.usedLegacy && 'EMAIL_HOST',
    user.usedLegacy && 'EMAIL_USER',
    pass.usedLegacy && 'EMAIL_PASS',
    port.usedLegacy && 'EMAIL_PORT',
    secure.usedLegacy && 'EMAIL_SECURE',
  ].filter((v): v is string => !!v)

  const missingVars = [!host.value && 'SMTP_HOST', !user.value && 'SMTP_USER', !pass.value && 'SMTP_PASS'].filter(
    (v): v is string => !!v
  )

  if (!host.value || !user.value || !pass.value) {
    return { smtp: null, diagnostics: { missingVars, usedLegacyVarNames } }
  }

  return {
    smtp: {
      host: host.value,
      port: Number(port.value) || 587,
      secure: secure.value === 'true',
      user: user.value,
      pass: pass.value,
    },
    diagnostics: { missingVars: [], usedLegacyVarNames },
  }
}

// Single point of truth for outbound mail config — see .env.local for the
// exact variable names to set (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/
// SMTP_SECURE/MAIL_FROM). Works with any SMTP-speaking provider (Resend,
// SendGrid, Postmark, Mailgun, SES, Google Workspace, etc.) — nothing here
// is vendor-specific.
export function getMailConfig(): MailConfig & { diagnostics: MailConfigDiagnostics } {
  const { smtp, diagnostics } = readSmtpConfig()
  const explicitProvider = process.env.MAIL_PROVIDER as MailProvider | undefined

  // MAIL_PROVIDER=console forces the dev-style console log even if SMTP_*
  // happens to be set (useful for staging environments that shouldn't send
  // real mail). Otherwise the provider is auto-detected from SMTP_* being
  // present, so most deployments never need to set MAIL_PROVIDER at all.
  const provider: MailProvider = explicitProvider === 'console' ? 'console' : smtp ? 'smtp' : 'console'

  if (explicitProvider === 'smtp' && !smtp) {
    // MAIL_PROVIDER=smtp was requested but the config didn't actually
    // resolve — this exact silent mismatch was the 2026-07-22 incident.
    // Loud on every call rather than only at cold start, since serverless/
    // PM2-restart environments don't have a single reliable "startup" log.
    console.error(
      JSON.stringify({
        event: 'mail_config_mismatch',
        message: 'MAIL_PROVIDER=smtp but SMTP config is incomplete — falling back to console (no real email will be sent)',
        missingVars: diagnostics.missingVars,
      })
    )
  }

  return {
    provider,
    from: process.env.MAIL_FROM || 'The Untitled Store <no-reply@untitledstore.com>',
    smtp,
    diagnostics: { provider, smtpConfigured: !!smtp, ...diagnostics },
  }
}
