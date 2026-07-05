'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRODUCTION_STAGE_KEYS, PRODUCTION_STAGE_KEY_LABEL } from '@/lib/constants'
import { isChecklistComplete } from './types'
import type { IOrder } from '@/types'

const CHECKLIST_LABEL: Record<string, string> = {
  printing: 'Printing complete and verified',
  stitching: 'Stitching complete and verified',
  finishing: 'Finishing / packaging complete',
  qcCheck: 'QC passed',
}

interface ProductionChecklistCardProps {
  order: IOrder
  canComplete: boolean
  onCompleted: () => void
}

export function ProductionChecklistCard({ order, canComplete, onCompleted }: ProductionChecklistCardProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const alreadyCompleted = Boolean(order.productionCompletedAt)
  const ready = isChecklistComplete(order)

  const handleComplete = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}/production-complete`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) onCompleted()
      else setError(data.error || 'Failed to mark production complete')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Completion Checklist</h3>
      <div className="space-y-2 mb-4">
        {PRODUCTION_STAGE_KEYS.map((key) => {
          const checked = order.productionStages[key].status === 'completed'
          return (
            <label key={key} className="flex items-center gap-2 text-sm">
              <span className={cn('w-4 h-4 rounded flex items-center justify-center border', checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300')}>
                {checked && <Check size={11} className="text-white" />}
              </span>
              <span className={checked ? 'text-gray-800 line-through' : 'text-gray-600'}>{CHECKLIST_LABEL[key] || PRODUCTION_STAGE_KEY_LABEL[key]}</span>
            </label>
          )
        })}
      </div>

      {alreadyCompleted ? (
        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Production completed — ready for shipping.
        </div>
      ) : (
        <>
          {!ready && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 mb-3">
              Completion button unlocks when all checklist items are checked.
            </div>
          )}
          <button
            onClick={handleComplete}
            disabled={!ready || !canComplete || saving}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-colors',
              ready && canComplete ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {saving ? 'Completing…' : 'Mark Production Complete'}
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
