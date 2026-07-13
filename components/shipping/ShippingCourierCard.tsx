'use client'

import { useState } from 'react'
import { Pencil, Truck, AlertTriangle } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { COURIER_LIST } from '@/lib/constants'
import type { IOrder } from '@/types'

interface ShippingCourierCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : ''
}

export function ShippingCourierCard({ order, canEdit, onUpdated }: ShippingCourierCardProps) {
  const needsDispatch = order.status === 'shipping_ready'
  // Saving courier details on a shipping_ready order auto-dispatches it (see
  // the courierPartner intent in app/api/orders/[id]/route.ts) — there's no
  // way to "prepare" details without triggering that, so once blocked we
  // don't offer the edit flow at all rather than let it fail on save.
  const dispatchBlocked = needsDispatch && Boolean(order.dispatchBlockedReason)
  const [editing, setEditing] = useState(false)
  const [courierPartner, setCourierPartner] = useState(order.courierPartner || '')
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '')
  const [dispatchDate, setDispatchDate] = useState(toDateInput(order.dispatchDate))
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(toDateInput(order.expectedDeliveryDate))
  const [shipmentWeight, setShipmentWeight] = useState(order.shipmentWeight != null ? String(order.shipmentWeight) : '')
  const [packageCount, setPackageCount] = useState(order.packageCount != null ? String(order.packageCount) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const startEdit = () => {
    setError('')
    setCourierPartner(order.courierPartner || '')
    setTrackingNumber(order.trackingNumber || '')
    setDispatchDate(toDateInput(order.dispatchDate))
    setExpectedDeliveryDate(toDateInput(order.expectedDeliveryDate))
    setShipmentWeight(order.shipmentWeight != null ? String(order.shipmentWeight) : '')
    setPackageCount(order.packageCount != null ? String(order.packageCount) : '')
    setEditing(true)
  }

  const save = async () => {
    if (!courierPartner) {
      setError('Courier is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierPartner,
          trackingNumber: trackingNumber || undefined,
          dispatchDate: dispatchDate || undefined,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          shipmentWeight: shipmentWeight ? Number(shipmentWeight) : undefined,
          packageCount: packageCount ? Number(packageCount) : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) { setEditing(false); onUpdated() }
      else setError(data.error || 'Failed to save shipping details')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Courier & Tracking</h3>
        {canEdit && !editing && (
          <button onClick={startEdit} className="text-gray-400 hover:text-gray-600" title="Edit shipping details">
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <Select
            label="Courier *"
            value={courierPartner}
            onChange={(e) => setCourierPartner(e.target.value)}
            options={[{ value: '', label: 'Select courier' }, ...COURIER_LIST.map((c) => ({ value: c, label: c }))]}
          />
          <Input label="Tracking Number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dispatch Date" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
            <Input label="Expected Delivery" type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" type="number" min="0" value={shipmentWeight} onChange={(e) => setShipmentWeight(e.target.value)} />
            <Input label="Packages" type="number" min="0" value={packageCount} onChange={(e) => setPackageCount(e.target.value)} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} loading={saving} icon={needsDispatch ? <Truck size={14} /> : undefined}>
              {needsDispatch ? 'Dispatch Order' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <div>
            <p className="text-xs text-gray-400">Courier</p>
            <p className="text-sm font-medium text-gray-900">{order.courierPartner || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Tracking Number</p>
            <p className="text-sm font-medium text-gray-900">{order.trackingNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Dispatch Date</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(order.dispatchDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Expected Delivery</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(order.expectedDeliveryDate)}</p>
          </div>
          {needsDispatch && canEdit && !dispatchBlocked && (
            <div className="col-span-2 mt-1">
              <Button size="sm" icon={<Truck size={14} />} onClick={startEdit}>Dispatch Order</Button>
            </div>
          )}
          {dispatchBlocked && (
            <div className="col-span-2 mt-1 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{order.dispatchBlockedReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
