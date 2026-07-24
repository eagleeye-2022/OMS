'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Factory, ShoppingBag, Calculator, Palette, Truck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { OtpInput } from '@/components/auth/OtpInput'
import { ROLE_DEFAULT_REDIRECT, ROLE_LABEL, type Role } from '@/lib/constants'

const OTP_TTL_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 30

// Shown to everyone who lands on /login, before any email is entered — this
// is not a permissions list. The server is the actual boundary: whichever
// role is picked here is sent as `selectedRole`, and request-login-otp/
// verify-login-otp both reject (hard, no OTP / no session) unless it matches
// that email's real User.role in the DB. A production account cannot use
// this picker to become a different role than the one it was provisioned
// with — see the `role_mismatch_denied` check in both routes.
const LOGIN_ROLES: { role: Role; icon: React.ReactNode }[] = [
  { role: 'admin', icon: <ShieldCheck size={20} /> },
  { role: 'operations', icon: <Factory size={20} /> },
  { role: 'sales', icon: <ShoppingBag size={20} /> },
  { role: 'accounting', icon: <Calculator size={20} /> },
  { role: 'creative', icon: <Palette size={20} /> },
]

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'email' | 'otp'>('role')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
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
      body: JSON.stringify({ email, selectedRole }),
    })
    const data = await res.json()
    return data as { success: boolean; error?: string; role?: Role }
  }

  const handlePickRole = (role: Role) => {
    setSelectedRole(role)
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
        body: JSON.stringify({ email, otp, selectedRole }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Verification failed')
        return
      }
      const role = data.data?.role as keyof typeof ROLE_DEFAULT_REDIRECT | undefined
      router.push(role ? ROLE_DEFAULT_REDIRECT[role] : '/login')
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

  const handleChangeEmail = () => {
    setStep('email')
    setOtp('')
    setError('')
  }

  const handleChangeRole = () => {
    setStep('role')
    setSelectedRole(null)
    setEmail('')
    setOtp('')
    setError('')
  }

  if (step === 'role') {
    return (
      <AuthLayout title="Log In" subtitle="Select your role to continue.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LOGIN_ROLES.map(({ role, icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => handlePickRole(role)}
              className="flex items-center gap-3 p-4 text-left border border-gray-200 rounded-lg bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-900 text-white shrink-0">{icon}</div>
              <p className="font-medium text-gray-900">{ROLE_LABEL[role]}</p>
            </button>
          ))}
          {/* Shipping is NOT a separate login role — the Production team also
              operates Shipping (Production/Shipping accounts reach it via the
              operations role + SHIPPING_EMAIL_ALLOWLIST, not a shipping role of
              their own). So this is an info note, not a role button: it points
              Shipping users at the Production login instead of pretending the
              module is unavailable. Keep it in sync with that access rule; do
              NOT turn it into a LOGIN_ROLES entry (there is no shipping role). */}
          <div className="sm:col-span-2 flex items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-blue-600 text-white shrink-0"><Truck size={18} /></div>
            <div>
              <p className="font-medium text-gray-900">Shipping is handled by the Production team</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Please log in as <span className="font-medium">Production</span> to access the Shipping module — Production team accounts are used for Shipping too.
              </p>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (step === 'otp' && selectedRole) {
    return (
      <AuthLayout title="Enter Your Code" subtitle={`Logging in as: ${ROLE_LABEL[selectedRole]}`}>
        <form onSubmit={handleVerify} className="space-y-5">
          <p className="text-sm text-gray-600 -mt-2">
            We sent a 6-digit login code to <span className="font-medium text-gray-900">{email}</span>.
          </p>

          <OtpInput value={otp} onChange={setOtp} disabled={loading} />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" variant="dark" className="w-full justify-center" loading={loading}>
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
          <button type="button" onClick={handleChangeEmail} className="text-sm text-blue-600 hover:underline">
            ← Use a different email
          </button>
        </div>

        <div className="mt-8 pt-5 border-t border-gray-100 text-center text-xs text-gray-400">
          Having trouble?{' '}
          <a href="mailto:support@untitledstore.com" className="text-blue-600 hover:underline">
            Contact Support
          </a>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Log In" subtitle={selectedRole ? `Logging in as: ${ROLE_LABEL[selectedRole]}` : undefined}>
      <button
        type="button"
        onClick={handleChangeRole}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} /> Change role
      </button>

      <form onSubmit={handleSendCode} className="space-y-4">
        <Input
          label="Enter your email address"
          type="email"
          placeholder="you@company.com"
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
