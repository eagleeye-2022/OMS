'use client'

import { useState } from 'react'
import { Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { OrderHeaderCard } from './OrderHeaderCard'
import { OrderProgressStepper } from './OrderProgressStepper'
import { OrderSpecsCard } from './OrderSpecsCard'
import { OrderFinanceCard } from './OrderFinanceCard'
import { AssignedTeamCard } from './AssignedTeamCard'
import { AssetsDocumentsCard } from './AssetsDocumentsCard'
import { InternalNotesCard } from './InternalNotesCard'
import { OrderTimelineCard } from './OrderTimelineCard'
import { DESIGN_STATUS, PRODUCTION_STAGE } from '@/lib/constants'
import type { IActivityLog, IOrder, Role, DesignStatus, ProductionStage } from '@/types'

const DESIGN_STATUS_OPTIONS = Object.values(DESIGN_STATUS).map((v) => ({ value: v, label: v.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))
const PRODUCTION_STAGE_OPTIONS = Object.values(PRODUCTION_STAGE).map((v) => ({ value: v, label: v.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

function CreativeUpdateCard({ order, onUpdated }: { order: IOrder; onUpdated: () => void }) {
  const [designStatus, setDesignStatus] = useState<DesignStatus>(order.designStatus)
  const [remarks, setRemarks] = useState(order.creativeRemarks || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/orders/${order._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designStatus, creativeRemarks: remarks }),
    })
    const d = await res.json()
    if (d.success) onUpdated()
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Design Status (Creative)</h3>
      <div className="space-y-3">
        <Select label="Design Status" value={designStatus} onChange={(e) => setDesignStatus(e.target.value as DesignStatus)} options={DESIGN_STATUS_OPTIONS} />
        <Textarea label="Creative Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks for this order..." />
        <Button size="sm" loading={saving} onClick={save}>Save Update</Button>
      </div>
    </div>
  )
}

function ProductionUpdateCard({ order, onUpdated }: { order: IOrder; onUpdated: () => void }) {
  const [stage, setStage] = useState<ProductionStage>(order.productionStage || 'printing')
  const [remarks, setRemarks] = useState(order.productionRemarks || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/orders/${order._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productionStage: stage, productionRemarks: remarks }),
    })
    const d = await res.json()
    if (d.success) onUpdated()
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Production Stage (Production)</h3>
      <div className="space-y-3">
        <Select label="Production Stage" value={stage} onChange={(e) => setStage(e.target.value as ProductionStage)} options={PRODUCTION_STAGE_OPTIONS} />
        <Textarea label="Production Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add production notes..." />
        <Button size="sm" loading={saving} onClick={save}>Save Update</Button>
      </div>
    </div>
  )
}

interface OrderDetailPanelProps {
  order: IOrder | null
  logs: IActivityLog[]
  loading: boolean
  role: Role
  hasAnyOrders?: boolean
  onEdit: () => void
  onRefresh: () => void
}

export function OrderDetailPanel({ order, logs, loading, role, hasAnyOrders = true, onEdit, onRefresh }: OrderDetailPanelProps) {
  if (loading) return <div className="bg-white rounded-xl border border-gray-200 flex-1 w-full"><PageLoader /></div>

  if (!order) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 flex-1 w-full flex items-center justify-center min-h-64">
        {hasAnyOrders ? (
          <EmptyState title="Select an order" description="Choose an order from the list to view its details." />
        ) : (
          <EmptyState title="No orders yet" description="Create your first order to get started." />
        )}
      </div>
    )
  }

  const canEditCore = ['admin', 'sales'].includes(role)
  const canViewFinance = order.totalAmount != null

  return (
    <div className="flex-1 w-full space-y-5 min-w-0">
      <OrderHeaderCard order={order} canEdit={canEditCore} onEdit={onEdit} />

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Lifecycle</p>
        <OrderProgressStepper status={order.status} />
      </div>

      <div className={`grid grid-cols-1 gap-5 ${canViewFinance ? 'sm:grid-cols-2' : ''}`}>
        <OrderSpecsCard order={order} />
        {canViewFinance && <OrderFinanceCard order={order} onPaymentLogged={onRefresh} />}
      </div>

      {role === 'creative' && <CreativeUpdateCard order={order} onUpdated={onRefresh} />}
      {role === 'operations' && <ProductionUpdateCard order={order} onUpdated={onRefresh} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <AssignedTeamCard order={order} canEdit={canEditCore} onUpdated={onRefresh} />
        <AssetsDocumentsCard order={order} canEdit={['admin', 'sales', 'creative', 'operations'].includes(role)} onUpdated={onRefresh} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InternalNotesCard order={order} onUpdated={onRefresh} noteType="general" />
        <OrderTimelineCard logs={logs} />
      </div>
    </div>
  )
}
