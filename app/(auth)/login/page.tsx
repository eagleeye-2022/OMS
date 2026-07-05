'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ROLE_DEFAULT_REDIRECT } from '@/lib/constants'

const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@untitledstore.com', password: 'Admin@123', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { role: 'Sales', email: 'sales@untitledstore.com', password: 'Sales@123', color: 'bg-green-50 border-green-200 text-green-700' },
  { role: 'Creative', email: 'creative@untitledstore.com', password: 'Creative@123', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { role: 'Production', email: 'production@untitledstore.com', password: 'Prod@123', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { role: 'Shipping', email: 'shipping@untitledstore.com', password: 'Ship@123', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { role: 'Accounts', email: 'accounts@untitledstore.com', password: 'Acc@123', color: 'bg-red-50 border-red-200 text-red-700' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Login failed')
      } else {
        const role = data.data?.role as keyof typeof ROLE_DEFAULT_REDIRECT | undefined
        router.push(role ? ROLE_DEFAULT_REDIRECT[role] : '/login')
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email)
    setPassword(cred.password)
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setError('')
        alert('Database seeded! You can now log in.')
      } else {
        setError('Seed failed: ' + data.error)
      }
    } catch {
      setError('Seed request failed')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500 rounded-xl mb-4">
            <Package size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">The Untitled Store</h1>
          <p className="text-sm text-gray-500 mt-1">Order Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@untitledstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full justify-center" loading={loading}>
              Sign In
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Login — Demo Roles</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.role}
                  onClick={() => quickLogin(cred)}
                  className={`text-xs border rounded-lg px-3 py-2 font-medium text-left transition-colors hover:opacity-80 ${cred.color}`}
                >
                  {cred.role}
                </button>
              ))}
            </div>
          </div>

          {/* Seed button */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">First time setup? Populate the database with demo data.</p>
            <Button variant="outline" size="sm" onClick={handleSeed} loading={seeding} className="text-xs">
              Seed Demo Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
