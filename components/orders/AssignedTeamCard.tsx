'use client'

import { useEffect, useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Input'
import type { IAssignedTeam, IOrder, IUser } from '@/types'

const SLOTS: { key: keyof IAssignedTeam; label: string; roleFilter: string }[] = [
  { key: 'salesExecutive', label: 'Sales Executive', roleFilter: 'sales' },
  { key: 'creativeExecutive', label: 'Creative Executive', roleFilter: 'creative' },
  { key: 'productionManager', label: 'Production Manager', roleFilter: 'production' },
]

interface AssignedTeamCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
}

export function AssignedTeamCard({ order, canEdit, onUpdated }: AssignedTeamCardProps) {
  const [editing, setEditing] = useState(false)
  const [options, setOptions] = useState<Record<string, IUser[]>>({})
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing && Object.keys(options).length === 0) {
      fetch(`/api/orders/${order._id}/assign-team`).then((r) => r.json()).then((d) => { if (d.success) setOptions(d.data.options) })
    }
  }, [editing, options, order._id])

  const startEdit = () => {
    const team = order.assignedTeam
    setError('')
    setForm({
      salesExecutive: typeof team.salesExecutive === 'string' ? team.salesExecutive : team.salesExecutive?._id || '',
      creativeExecutive: typeof team.creativeExecutive === 'string' ? team.creativeExecutive : team.creativeExecutive?._id || '',
      productionManager: typeof team.productionManager === 'string' ? team.productionManager : team.productionManager?._id || '',
    })
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}/assign-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { setEditing(false); onUpdated() }
      else setError(data.error || 'Failed to save team assignment')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const memberName = (member: IUser | string | undefined) => {
    if (!member) return null
    return typeof member === 'string' ? null : member.name
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Team</h3>
        {canEdit && !editing && (
          <button onClick={startEdit} className="text-gray-400 hover:text-gray-600"><Pencil size={13} /></button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700"><Check size={15} /></button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {SLOTS.map((slot) => {
          const name = memberName(order.assignedTeam[slot.key])
          return (
            <div key={slot.key}>
              {editing ? (
                <Select
                  label={slot.label}
                  value={form[slot.key] || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [slot.key]: e.target.value }))}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...(options[slot.roleFilter] || []).map((u) => ({ value: u._id, label: u.name })),
                  ]}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar name={name || '?'} size="sm" />
                  <div>
                    <p className="text-sm text-gray-800">{slot.label}</p>
                    <p className="text-sm font-medium text-gray-900">{name || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </div>
  )
}
