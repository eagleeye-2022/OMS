'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Something went wrong')
        return
      }
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Forgot Password?">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Enter your email to receive a password reset code."
          type="email"
          placeholder="Phone no or email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" variant="dark" className="w-full justify-center" loading={loading}>
          Send OTP
        </Button>
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
