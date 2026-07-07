'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { Avatar } from '@/components/ui/Avatar'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { ROLE_PERMISSIONS } from '@/lib/constants'
import type { IUser, Role } from '@/types'

const ROLES: Role[] = ['admin', 'sales', 'creative', 'production', 'shipping', 'accounts']

const ROLE_COLOR: Record<Role, string> = {
  admin: 'bg-red-100 text-red-700',
  sales: 'bg-blue-100 text-blue-700',
  creative: 'bg-purple-100 text-purple-700',
  production: 'bg-amber-100 text-amber-700',
  shipping: 'bg-teal-100 text-teal-700',
  accounts: 'bg-green-100 text-green-700',
}

const MODULE_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  orders: 'Orders',
  'creative-queue': 'Creative Queue',
  production: 'Production Queue',
  shipping: 'Shipping',
  accounts: 'Accounts',
  'user-roles': 'User Roles',
  settings: 'Settings',
}

// Derived from the real ROLE_PERMISSIONS matrix (lib/constants.ts) rather than
// a hand-maintained duplicate, so this admin-facing summary can't drift out
// of sync with what each role can actually reach. Notifications are appended
// separately since every logged-in user gets them regardless of module access.
const ROLE_PERMISSIONS_DISPLAY: Record<Role, string[]> = Object.fromEntries(
  ROLES.map((role) => [role, [...ROLE_PERMISSIONS[role].map((m) => MODULE_LABEL[m] || m), 'Notifications']])
) as Record<Role, string[]>

function UserFormModal({ user, onSave, onClose }: { user?: IUser | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'sales',
    password: '',
    isActive: user?.isActive !== false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = isEdit ? `/api/users/${user!._id}` : '/api/users'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit
        ? { name: form.name, role: form.role, isActive: form.isActive, ...(form.password ? { password: form.password } : {}) }
        : form
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) onSave()
      else setError(data.error || 'Failed')
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} required />
      {!isEdit && <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />}
      <Select label="Role *" value={form.role} onChange={e => set('role', e.target.value)} required
        options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
      <Input label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'} type="password" value={form.password}
        onChange={e => set('password', e.target.value)} required={!isEdit} minLength={6} />
      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
          Active (deactivate to block login)
        </label>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Create User'}</Button>
      </div>
    </form>
  )
}

export default function UserRolesPage() {
  const [users, setUsers] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<IUser | null>(null)
  const [expandedRole, setExpandedRole] = useState<Role | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    if (data.success) setUsers(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <PageLoader />

  const byRole = ROLES.reduce<Record<Role, IUser[]>>((acc, r) => {
    acc[r] = users.filter(u => u.role === r)
    return acc
  }, {} as Record<Role, IUser[]>)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Roles</h1>
          <p className="text-sm text-gray-500">{users.length} users across {ROLES.length} roles</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => { setEditUser(null); setModalOpen(true) }}>Add User</Button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ROLES.map(role => (
          <button key={role} onClick={() => setExpandedRole(expandedRole === role ? null : role)}
            className={`rounded-xl border text-left p-4 transition-colors ${expandedRole === role ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <Badge label={role.charAt(0).toUpperCase() + role.slice(1)} className={ROLE_COLOR[role]} />
              <span className="text-xs text-gray-400">{byRole[role].length} user{byRole[role].length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {ROLE_PERMISSIONS_DISPLAY[role].slice(0, 4).map(p => (
                <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p}</span>
              ))}
              {ROLE_PERMISSIONS_DISPLAY[role].length > 4 && (
                <span className="text-xs text-gray-400">+{ROLE_PERMISSIONS_DISPLAY[role].length - 4} more</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Permissions Detail */}
      {expandedRole && (
        <div className="bg-white rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Badge label={expandedRole.charAt(0).toUpperCase() + expandedRole.slice(1)} className={ROLE_COLOR[expandedRole]} />
            <h2 className="text-sm font-semibold text-gray-900">Module Permissions</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_PERMISSIONS_DISPLAY[expandedRole].map(p => (
              <span key={p} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Users</h2>
        </div>
        <DataTable
          data={users as unknown as Record<string, unknown>[]}
          keyField="_id"
          emptyMessage="No users found"
          columns={[
            {
              key: 'name', header: 'Name',
              render: row => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.name as string} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{row.name as string}</p>
                    <p className="text-xs text-gray-500">{row.email as string}</p>
                  </div>
                </div>
              )
            },
            {
              key: 'role', header: 'Role',
              render: row => {
                const r = row.role as Role
                return <Badge label={r.charAt(0).toUpperCase() + r.slice(1)} className={ROLE_COLOR[r]} />
              }
            },
            {
              key: 'isActive', header: 'Status',
              render: row => (
                <Badge label={row.isActive !== false ? 'Active' : 'Inactive'}
                  className={row.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} />
              )
            },
            { key: 'createdAt', header: 'Created', render: row => <span className="text-sm text-gray-500">{formatDate(row.createdAt as string)}</span> },
            {
              key: 'actions', header: '',
              render: row => (
                <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setEditUser(row as unknown as IUser); setModalOpen(true) }}>
                  Edit
                </Button>
              )
            },
          ]}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add User'} size="sm">
        <UserFormModal user={editUser} onSave={() => { setModalOpen(false); load() }} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  )
}
