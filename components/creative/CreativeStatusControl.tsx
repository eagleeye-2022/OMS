'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { DESIGN_STATUS, DESIGN_STATUS_LABEL, DESIGN_STATUS_COLOR } from '@/lib/constants'
import type { DesignStatus, IOrder } from '@/types'

const OPTIONS = Object.values(DESIGN_STATUS)

interface CreativeStatusControlProps {
  order: IOrder
  onUpdated: () => void
}

export function CreativeStatusControl({ order, onUpdated }: CreativeStatusControlProps) {
  const [open, setOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<DesignStatus | null>(null)
  const [revisionNote, setRevisionNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPendingStatus(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const submit = async (designStatus: DesignStatus, note?: string) => {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = { designStatus, creativeRemarks: order.creativeRemarks || '' }
      if (note) body.revisionNote = note
      const res = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setOpen(false)
        setPendingStatus(null)
        setRevisionNote('')
        onUpdated()
      } else {
        setError(data.error || 'Failed to update status')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handlePick = (status: DesignStatus) => {
    if (status === order.designStatus) { setOpen(false); return }
    if (status === 'revision_requested') {
      setPendingStatus(status)
      return
    }
    submit(status)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60',
          DESIGN_STATUS_COLOR[order.designStatus]
        )}
      >
        {DESIGN_STATUS_LABEL[order.designStatus]}
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          {pendingStatus ? (
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Revision note</p>
              <Textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Describe what needs to change..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" type="button" onClick={() => setPendingStatus(null)}>Cancel</Button>
                <Button size="sm" type="button" loading={saving} onClick={() => submit(pendingStatus, revisionNote)}>Confirm</Button>
              </div>
            </div>
          ) : (
            OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePick(value)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', DESIGN_STATUS_COLOR[value])}>
                  {DESIGN_STATUS_LABEL[value]}
                </span>
                {value === order.designStatus && <Check size={14} className="text-blue-600" />}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
