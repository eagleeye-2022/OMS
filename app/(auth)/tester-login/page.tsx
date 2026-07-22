'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Factory, ShoppingBag, Calculator, Palette, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { OtpInput } from '@/components/auth/OtpInput'
import { ROLE_DEFAULT_REDIRECT, ROLE_LABEL, type Role } from '@/lib/constants'

const OTP_TTL_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 30

// Not a permissions list — every role button is shown to anyone who lands
// on this unlisted page. The server (see testRole handling in
// request-login-otp / verify-login-otp, backed by lib/testers.ts) is the
// actual boundary: an email that isn't approved for the picked role gets a
// clear rejection before an OTP is even sent, or a silent fallback to its
// real DB role if it somehow got past that. This page is reachable only by
// a direct URL known to the internal testers — it deliberately isn't linked
// from /login or anywhere else in the app.
const TESTABLE_ROLES: { role: Role; icon: React.ReactNode; blurb: string }[] = [
  { role: 'admin', icon: <ShieldCheck size={20} />, blurb: 'Full system — every module' },
  { role: 'operations', icon: <Factory size={20} />, blurb: 'Production floor + dispatch' },
  { role: 'sales', icon: <ShoppingBag size={20} />, blurb: 'Clients + orders' },
  { role: 'accounting', icon: <Calculator size={20} />, blurb: 'Accounts + shipping' },
  { role: 'creative', icon: <Palette size={20} />, blurb: 'Design queue' },
]

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TesterLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'email' | 'otp'>('role')
  const [testRole, setTestRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (step !== 'otp') return
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const requestOtp = async () => {
    const res = await fetch('/api/auth/request-login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, testRole }),
    })
    const data = await res.json()
    return data as { success: boolean; error?: string }
  }

  const handlePickRole = (role: Role) => {
    setTestRole(role)
    setError('')
    setStep('email')
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await requestOtp()
      if (!data.success) {
        setError(data.error || 'Could not send login code')
        return
      }
      setOtp('')
      setSecondsLeft(OTP_TTL_SECONDS)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setStep('otp')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, testRole }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Verification failed')
        return
      }
      const grantedRole = data.data?.role as Role | undefined
      if (grantedRole && testRole && grantedRole !== testRole) {
        // Server didn't grant the picked role (not an approved tester for
        // it) — logged in fine, just not as the module they meant to test.
        setNotice(
          `Heads up: your account isn't approved to test "${ROLE_LABEL[testRole]}", so you're logged in as your normal role (${ROLE_LABEL[grantedRole]}) instead.`
        )
        setTimeout(() => {
          router.push(ROLE_DEFAULT_REDIRECT[grantedRole])
          router.refresh()
        }, 2500)
        return
      }
      router.push(grantedRole ? ROLE_DEFAULT_REDIRECT[grantedRole] : '/tester-login')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResending(true)
    setError('')
    try {
      const data = await requestOtp()
      if (!data.success) {
        setError(data.error || 'Could not resend code')
        return
      }
      setSecondsLeft(OTP_TTL_SECONDS)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtp('')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  if (step === 'role') {
    return (
      <AuthLayout title="Tester Login" subtitle="Pick the module you want to test — you'll log in with your usual email + OTP.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TESTABLE_ROLES.map(({ role, icon, blurb }) => (
            <button
              key={role}
              type="button"
              onClick={() => handlePickRole(role)}
              className="flex items-start gap-3 p-4 text-left border border-gray-200 rounded-lg bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-900 text-white shrink-0">{icon}</div>
              <div>
                <p className="font-medium text-gray-900">{ROLE_LABEL[role]}</p>
                <p className="text-xs text-gray-500">{blurb}</p>
              </div>
            </button>
          ))}
        </div>
      </AuthLayout>
    )
  }

  if (step === 'otp' && testRole) {
    return (
      <AuthLayout title="Enter Your Code" subtitle={`Testing as: ${ROLE_LABEL[testRole]}`}>
        <form onSubmit={handleVerify} className="space-y-5">
          <p className="text-sm text-gray-600 -mt-2">
            We sent a 6-digit login code to <span className="font-medium text-gray-900">{email}</span>.
          </p>

          <OtpInput value={otp} onChange={setOtp} disabled={loading} />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {notice && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{notice}</p>
          )}

          <Button type="submit" variant="dark" className="w-full justify-center" loading={loading} disabled={!!notice}>
            Verify &amp; Log In
          </Button>

          <div className="text-center space-y-1">
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
                className="text-blue-600 font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                Resend Code
              </button>
            </p>
            <p className="text-xs text-gray-400">
              {secondsLeft > 0 ? `Expires in ${formatCountdown(secondsLeft)}` : 'Code expired — please resend'}
            </p>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp('')
              setError('')
              setNotice('')
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Use a different email
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Tester Login" subtitle={testRole ? `Testing as: ${ROLE_LABEL[testRole]}` : undefined}>
      <button
        type="button"
        onClick={() => {
          setStep('role')
          setError('')
        }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Change role
      </button>

      <form onSubmit={handleSendCode} className="space-y-4">
        <Input
          label="Enter your tester email address"
          type="email"
          placeholder="you@eagleeyedigital.io"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" variant="dark" className="w-full justify-center" loading={loading}>
          Send Login Code
        </Button>
      </form>
    </AuthLayout>
  )
}
