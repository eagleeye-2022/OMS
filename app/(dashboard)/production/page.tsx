'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ProductionHeader } from '@/components/production/ProductionHeader'
import { ProductionSummaryCards } from '@/components/production/ProductionSummaryCards'
import { ProductionQueueTable } from '@/components/production/ProductionQueueTable'
import { ProductionDetailDrawer } from '@/components/production/ProductionDetailDrawer'
import { useAuth } from '@/hooks/useAuth'
import type { IActivityLog, IOrder } from '@/types'

export default function ProductionPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<IOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [assignedToMe, setAssignedToMe] = useState(false)
  // Production-role-only tab: mutually exclusive with assignedToMe above
  // (that one stays Admin's "My Batches / All") — see ProductionHeader.
  const [productionShowAll, setProductionShowAll] = useState(false)

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isProductionRole = user?.role === 'operations'
  const canEditStages = isAdmin || isProductionRole

  // Tracks the most recently *requested* list query / order id so an
  // out-of-order network response can be detected and discarded instead of
  // overwriting newer, correct data — same pattern as Clients/Orders/Accounts.
  const latestListKeyRef = useRef('')
  const latestOrderIdRef = useRef<string | undefined>(undefined)

  const loadQueue = useCallback(async (q = '', mine = false, showAll = false, silent = false) => {
    const key = `${q}::${mine}::${showAll}`
    latestListKeyRef.current = key
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ search: q, relevantTo: 'production', limit: '200' })
      if (mine) params.set('assignedToMe', 'true')
      if (showAll) params.set('view', 'all')
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      if (latestListKeyRef.current !== key) return
      if (data.success) {
        setOrders(data.data)
        setTotal(data.total)
      }
    } finally {
      if (!silent && latestListKeyRef.current === key) setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    latestOrderIdRef.current = id
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (latestOrderIdRef.current !== id) return
      if (data.success) {
        setSelectedOrder(data.data.order)
        setLogs(data.data.logs)
      }
    } finally {
      if (latestOrderIdRef.current === id) setDetailLoading(false)
    }
  }, [])

  useEffect(() => { loadQueue(search, assignedToMe, productionShowAll) }, [loadQueue]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => loadQueue(search, assignedToMe, productionShowAll), 300)
    return () => clearTimeout(t)
  }, [search, assignedToMe, productionShowAll, loadQueue])

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
    loadQueue(search, assignedToMe, productionShowAll, true)
  }

  return (
    <div className="p-6 space-y-5">
      <ProductionHeader
        total={total}
        search={search}
        onSearchChange={setSearch}
        isProductionRole={isProductionRole}
        assignedToMe={assignedToMe}
        onAssignedToMeChange={setAssignedToMe}
        productionShowAll={productionShowAll}
        onProductionShowAllChange={setProductionShowAll}
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
        logs={logs}
        loading={detailLoading}
        isAdmin={isAdmin}
        canEditStages={canEditStages}
        currentUserId={user?.id}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
