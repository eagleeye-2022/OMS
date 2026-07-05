'use client'

import { useState } from 'react'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthContext } from '@/components/providers/AuthProvider'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' })
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [business, setBusiness] = useState({ storeName: 'The Untitled Store', gst: '', address: '', phone: '', website: '' })
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const saveProfile = async () => {
    setSaving('profile')
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name }),
      })
      const d = await res.json()
      if (d.success) showMsg('success', 'Profile updated.')
      else showMsg('error', d.error || 'Failed')
    } catch { showMsg('error', 'Network error') } finally { setSaving(null) }
  }

  const savePassword = async () => {
    if (password.next !== password.confirm) { showMsg('error', 'Passwords do not match.'); return }
    if (password.next.length < 6) { showMsg('error', 'Password must be at least 6 characters.'); return }
    setSaving('password')
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: password.current, password: password.next }),
      })
      const d = await res.json()
      if (d.success) { showMsg('success', 'Password changed.'); setPassword({ current: '', next: '', confirm: '' }) }
      else showMsg('error', d.error || 'Failed')
    } catch { showMsg('error', 'Network error') } finally { setSaving(null) }
  }

  const seedData = async () => {
    setSaving('seed')
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const d = await res.json()
      if (d.success) showMsg('success', 'Database seeded with demo data!')
      else showMsg('error', d.error || 'Seed failed')
    } catch { showMsg('error', 'Network error') } finally { setSaving(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and application preferences</p>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <SectionCard title="My Profile">
        <div className="space-y-4">
          <Input label="Full Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          <Input label="Email" value={profile.email} disabled />
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Role:</span>
            <span className="text-xs font-medium capitalize bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{user?.role}</span>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} loading={saving === 'profile'} size="sm">Save Profile</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Change Password">
        <div className="space-y-4">
          <Input label="Current Password" type="password" value={password.current} onChange={e => setPassword(p => ({ ...p, current: e.target.value }))} />
          <Input label="New Password" type="password" value={password.next} onChange={e => setPassword(p => ({ ...p, next: e.target.value }))} />
          <Input label="Confirm New Password" type="password" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} />
          <div className="flex justify-end">
            <Button onClick={savePassword} loading={saving === 'password'} size="sm">Change Password</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Business Information">
        <div className="space-y-4">
          <Input label="Store Name" value={business.storeName} onChange={e => setBusiness(b => ({ ...b, storeName: e.target.value }))} />
          <Input label="GST Number" value={business.gst} onChange={e => setBusiness(b => ({ ...b, gst: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
          <Textarea label="Address" value={business.address} onChange={e => setBusiness(b => ({ ...b, address: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={business.phone} onChange={e => setBusiness(b => ({ ...b, phone: e.target.value }))} />
            <Input label="Website" value={business.website} onChange={e => setBusiness(b => ({ ...b, website: e.target.value }))} placeholder="https://" />
          </div>
          <p className="text-xs text-gray-400">Business info is for display purposes only.</p>
        </div>
      </SectionCard>

      <SectionCard title="Demo & Development">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Seed the database with realistic demo data — 6 users, 12 clients, 15 orders at various stages, payments, shipments, and notifications.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 font-medium">Warning: This will clear all existing data and replace it with demo data.</p>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Demo credentials after seeding:</p>
            <p className="font-mono">admin@untitledstore.com / Admin@123</p>
            <p className="font-mono">sales@untitledstore.com / Sales@123</p>
            <p className="font-mono">creative@untitledstore.com / Creative@123</p>
            <p className="font-mono">production@untitledstore.com / Prod@123</p>
            <p className="font-mono">shipping@untitledstore.com / Ship@123</p>
            <p className="font-mono">accounts@untitledstore.com / Acc@123</p>
          </div>
          <Button variant="outline" onClick={seedData} loading={saving === 'seed'} size="sm">Seed Demo Data</Button>
        </div>
      </SectionCard>
    </div>
  )
}
