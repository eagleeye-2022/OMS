'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  PRODUCTION_STAGE_KEYS, PRODUCTION_STAGE_KEY_LABEL,
  PRODUCTION_STAGE_STATUS_LABEL, PRODUCTION_STAGE_STATUS_COLOR,
  type ProductionStageKey,
} from '@/lib/constants'
import type { IOrder } from '@/types'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

interface ProductionStageProgressCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
}

export function ProductionStageProgressCard({ order, canEdit, onUpdated }: ProductionStageProgressCardProps) {
  const [editingStage, setEditingStage] = useState<ProductionStageKey | null>(null)
  const [form, setForm] = useState({ status: 'pending', unitsCompleted: '', totalUnits: '', workerName: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const startEdit = (key: ProductionStageKey) => {
    const stage = order.productionStages[key]
    setError('')
    setForm({
      status: stage.status,
      unitsCompleted: String(stage.unitsCompleted ?? 0),
      totalUnits: String(stage.totalUnits || order.quantity),
      workerName: stage.workerName || '',
      note: stage.note || '',
    })
    setEditingStage(key)
  }

  const save = async () => {
    if (!editingStage) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: editingStage,
          status: form.status,
          unitsCompleted: Number(form.unitsCompleted) || 0,
          totalUnits: Number(form.totalUnits) || 0,
          workerName: form.workerName,
          note: form.note,
        }),
      })
      const data = await res.json()
      if (data.success) { setEditingStage(null); onUpdated() }
      else setError(data.error || 'Failed to update stage')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Production Progress</h3>
      <div className="space-y-4">
        {PRODUCTION_STAGE_KEYS.map((key) => {
          const stage = order.productionStages[key]
          const total = stage.totalUnits || order.quantity
          const progress = total > 0 ? Math.min(100, Math.round((stage.unitsCompleted / total) * 100)) : 0
          const isEditing = editingStage === key

          return (
            <div key={key} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{PRODUCTION_STAGE_KEY_LABEL[key]}</span>
                <div className="flex items-center gap-2">
                  <Badge label={PRODUCTION_STAGE_STATUS_LABEL[stage.status]} className={PRODUCTION_STAGE_STATUS_COLOR[stage.status]} />
                  {canEdit && !isEditing && (
                    <button onClick={() => startEdit(key)} className="text-gray-400 hover:text-gray-600"><Pencil size={12} /></button>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Units: {stage.unitsCompleted}/{total}</span>
                    {stage.workerName && <span>Worker: {stage.workerName}</span>}
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full">
                    <div className={cn('h-full rounded-full', stage.status === 'completed' ? 'bg-green-500' : 'bg-blue-500')} style={{ width: `${progress}%` }} />
                  </div>
                  {stage.note && <p className="text-xs text-gray-500 mt-1.5">{stage.note}</p>}
                </>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={STATUS_OPTIONS} />
                    <Input placeholder="Worker name" value={form.workerName} onChange={(e) => setForm((f) => ({ ...f, workerName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" min="0" placeholder="Units completed" value={form.unitsCompleted} onChange={(e) => setForm((f) => ({ ...f, unitsCompleted: e.target.value }))} />
                    <Input type="number" min="0" placeholder="Total units" value={form.totalUnits} onChange={(e) => setForm((f) => ({ ...f, totalUnits: e.target.value }))} />
                  </div>
                  <Textarea placeholder="Note (optional)" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" type="button" onClick={() => setEditingStage(null)}>
                      <X size={13} />
                    </Button>
                    <Button size="sm" type="button" loading={saving} onClick={save}>
                      <Check size={13} className="mr-1" /> Save
                    </Button>
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
