'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProductionHeader } from '@/components/production/ProductionHeader'
import { ProductionSummaryCards } from '@/components/production/ProductionSummaryCards'
import { ProductionQueueTable } from '@/components/production/ProductionQueueTable'
import { ProductionDetailDrawer } from '@/components/production/ProductionDetailDrawer'
import { useAuth } from '@/hooks/useAuth'
import type { IOrder } from '@/types'

export default function ProductionPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<IOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [assignedToMe, setAssignedToMe] = useState(false)

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  const canEditStages = user?.role === 'admin' || user?.role === 'production'

  const loadQueue = useCallback(async (q = '', mine = false, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ search: q, relevantTo: 'production', limit: '200' })
      if (mine) params.set('assignedToMe', 'true')
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data)
        setTotal(data.total)
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (data.success) setSelectedOrder(data.data.order)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => { loadQueue(search, assignedToMe) }, [loadQueue]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => loadQueue(search, assignedToMe), 300)
    return () => clearTimeout(t)
  }, [search, assignedToMe, loadQueue])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const handleSelect = (order: IOrder) => {
    setSelectedId(order._id)
    setDrawerOpen(true)
  }

  const handleUpdated = () => {
    if (selectedId) loadDetail(selectedId)
    // Silent: a stage/remark/assignee/completion change on the open ticket
    // shouldn't blank the whole queue into a loading skeleton.
    loadQueue(search, assignedToMe, true)
  }

  return (
    <div className="p-6 space-y-5">
      <ProductionHeader
        total={total}
        search={search}
        onSearchChange={setSearch}
        assignedToMe={assignedToMe}
        onAssignedToMeChange={setAssignedToMe}
      />

      <ProductionSummaryCards orders={orders} />

      <ProductionQueueTable
        orders={orders}
        loading={loading}
        search={search}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      <ProductionDetailDrawer
        open={drawerOpen}
        order={selectedOrder}
        loading={detailLoading}
        isAdmin={isAdmin}
        canEditStages={canEditStages}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
