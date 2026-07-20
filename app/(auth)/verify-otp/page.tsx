'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { OtpInput } from '@/components/auth/OtpInput'

const OTP_TTL_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 30

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Verification failed')
        return
      }
      router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`)
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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
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

  return (
    <AuthLayout title="Verification">
      <form onSubmit={handleVerify} className="space-y-5">
        <p className="text-sm text-gray-600 -mt-2">
          Enter the 6 digit OTP send to your phone no./email address
        </p>

        <OtpInput value={otp} onChange={setOtp} disabled={loading} />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" variant="dark" className="w-full justify-center" loading={loading}>
          Verify
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
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          ← Back to Login
        </Link>
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

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  )
}
