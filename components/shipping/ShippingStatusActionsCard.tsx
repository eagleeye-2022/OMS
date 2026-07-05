'use client'

import { useState } from 'react'
import { MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import type { IOrder } from '@/types'

interface ShippingStatusActionsCardProps {
  order: IOrder
  canUpdateStatus: boolean
  isAdmin: boolean
  onUpdated: () => void
}

const DELIVERABLE_STATUSES = ['dispatched', 'in_transit', 'delayed']

export function ShippingStatusActionsCard({ order, canUpdateStatus, isAdmin, onUpdated }: ShippingStatusActionsCardProps) {
  const [delayReason, setDelayReason] = useState('')
  const [showDelayForm, setShowDelayForm] = useState(false)
  const [saving, setSaving] = useState<'in_transit' | 'delayed' | 'delivered' | null>(null)
  const [error, setError] = useState('')

  if (!canUpdateStatus && !isAdmin) return null
  if (!['dispatched', 'in_transit', 'delayed'].includes(order.status)) return null

  const setStatus = async (status: 'in_transit' | 'delayed') => {
    setSaving(status)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(status === 'delayed' ? { delayReason: delayReason || undefined } : {}) }),
      })
      const data = await res.json()
      if (data.success) { setShowDelayForm(false); setDelayReason(''); onUpdated() }
      else setError(data.error || 'Failed to update status')
    } catch {
      setError('Network error')
    } finally {
      setSaving(null)
    }
  }

  const markDelivered = async () => {
    setSaving('delivered')
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}/mark-delivered`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) onUpdated()
      else setError(data.error || 'Failed to mark as delivered')
    } catch {
      setError('Network error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Shipping Actions</h3>

      <div className="flex flex-wrap gap-2">
        {canUpdateStatus && order.status !== 'in_transit' && (
          <Button variant="outline" size="sm" icon={<MapPin size={14} />} loading={saving === 'in_transit'} onClick={() => setStatus('in_transit')}>
            Mark In Transit
          </Button>
        )}
        {canUpdateStatus && order.status !== 'delayed' && !showDelayForm && (
          <Button variant="outline" size="sm" icon={<AlertTriangle size={14} />} onClick={() => setShowDelayForm(true)}>
            Mark as Delayed
          </Button>
        )}
        {isAdmin && DELIVERABLE_STATUSES.includes(order.status) && (
          <Button size="sm" icon={<CheckCircle2 size={14} />} loading={saving === 'delivered'} onClick={markDelivered}>
            Mark as Delivered
          </Button>
        )}
      </div>

      {showDelayForm && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="Reason for delay..."
            value={delayReason}
            onChange={(e) => setDelayReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setShowDelayForm(false); setDelayReason('') }}>Cancel</Button>
            <Button size="sm" loading={saving === 'delayed'} onClick={() => setStatus('delayed')}>Confirm Delay</Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
