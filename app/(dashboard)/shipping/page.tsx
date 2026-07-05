'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShippingHeader } from '@/components/shipping/ShippingHeader'
import { ShippingSummaryCards } from '@/components/shipping/ShippingSummaryCards'
import { ShippingQueueTable } from '@/components/shipping/ShippingQueueTable'
import { ShippingDetailDrawer } from '@/components/shipping/ShippingDetailDrawer'
import { useAuth } from '@/hooks/useAuth'
import type { IActivityLog, IOrder } from '@/types'

export default function ShippingPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<IOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  const canEditShipping = user?.role === 'admin' || user?.role === 'sales' || user?.role === 'accounts'

  const loadQueue = useCallback(async (q = '', silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ search: q, relevantTo: 'shipping', limit: '200' })
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
      if (data.success) {
        setSelectedOrder(data.data.order)
        setLogs(data.data.logs)
      }
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => { loadQueue(search) }, [loadQueue]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => loadQueue(search), 300)
    return () => clearTimeout(t)
  }, [search, loadQueue])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const handleSelect = (order: IOrder) => {
    setSelectedId(order._id)
    setDrawerOpen(true)
  }

  const handleUpdated = () => {
    if (selectedId) loadDetail(selectedId)
    // Silent: a courier/status/note change on the open ticket shouldn't
    // blank the whole queue into a loading skeleton.
    loadQueue(search, true)
  }

  return (
    <div className="p-6 space-y-5">
      <ShippingHeader total={total} search={search} onSearchChange={setSearch} />

      <ShippingSummaryCards orders={orders} />

      <ShippingQueueTable
        orders={orders}
        loading={loading}
        search={search}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      <ShippingDetailDrawer
        open={drawerOpen}
        order={selectedOrder}
        logs={logs}
        loading={detailLoading}
        canEditShipping={canEditShipping}
        isAdmin={isAdmin}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
