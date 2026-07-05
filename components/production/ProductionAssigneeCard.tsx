'use client'

import { useEffect, useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Input'
import type { IOrder, IUser } from '@/types'

interface ProductionAssigneeCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
}

export function ProductionAssigneeCard({ order, canEdit, onUpdated }: ProductionAssigneeCardProps) {
  const [editing, setEditing] = useState(false)
  const [options, setOptions] = useState<IUser[]>([])
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing && options.length === 0) {
      fetch(`/api/orders/${order._id}/assign-team`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setOptions(d.data.options.production || []) })
    }
  }, [editing, options.length, order._id])

  const assignee = order.assignedTeam?.productionManager as IUser | string | undefined
  const assigneeName = assignee && typeof assignee !== 'string' ? assignee.name : undefined
  const assigneeId = assignee ? (typeof assignee === 'string' ? assignee : assignee._id) : ''

  const startEdit = () => {
    setError('')
    setValue(assigneeId)
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}/assign-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionManager: value }),
      })
      const data = await res.json()
      if (data.success) { setEditing(false); onUpdated() }
      else setError(data.error || 'Failed to reassign')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned Team Member</h3>
        {canEdit && !editing && (
          <button onClick={startEdit} className="text-gray-400 hover:text-gray-600" title="Reassign"><Pencil size={13} /></button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700"><Check size={15} /></button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
          </div>
        )}
      </div>

      {editing ? (
        <Select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          options={[{ value: '', label: 'Unassigned' }, ...options.map((u) => ({ value: u._id, label: u.name }))]}
        />
      ) : (
        <div className="flex items-center gap-3">
          <Avatar name={assigneeName || '?'} size="md" />
          <div>
            <p className="text-xs text-gray-500">Production Manager</p>
            <p className="text-sm font-semibold text-gray-900">{assigneeName || 'Unassigned'}</p>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
