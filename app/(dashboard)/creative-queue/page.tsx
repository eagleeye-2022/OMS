'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CreativeHeader } from '@/components/creative/CreativeHeader'
import { CreativeBoard } from '@/components/creative/CreativeBoard'
import { CreativeDetailDrawer } from '@/components/creative/CreativeDetailDrawer'
import { useAuth } from '@/hooks/useAuth'
import type { IOrder } from '@/types'

export default function CreativeQueuePage() {
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

  // Tracks the most recently *requested* list query / order id so an
  // out-of-order network response can be detected and discarded instead of
  // overwriting newer, correct data — same pattern as Clients/Orders/Accounts.
  const latestListKeyRef = useRef('')
  const latestOrderIdRef = useRef<string | undefined>(undefined)

  const loadBoard = useCallback(async (q = '', mine = false, silent = false) => {
    const key = `${q}::${mine}`
    latestListKeyRef.current = key
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ search: q, relevantTo: 'creative', limit: '200' })
      if (mine) params.set('assignedToMe', 'true')
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
      if (data.success) setSelectedOrder(data.data.order)
    } finally {
      if (latestOrderIdRef.current === id) setDetailLoading(false)
    }
  }, [])

  useEffect(() => { loadBoard(search, assignedToMe) }, [loadBoard]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => loadBoard(search, assignedToMe), 300)
    return () => clearTimeout(t)
  }, [search, assignedToMe, loadBoard])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const handleSelect = (order: IOrder) => {
    setSelectedId(order._id)
    setDrawerOpen(true)
  }

  const handleUpdated = () => {
    if (selectedId) loadDetail(selectedId)
    // Silent: a status/remark/asset/assignee change on the open ticket
    // shouldn't blank the whole board into a loading skeleton.
    loadBoard(search, assignedToMe, true)
  }

  return (
    <div className="p-6 space-y-5">
      <CreativeHeader
        total={total}
        search={search}
        onSearchChange={setSearch}
        assignedToMe={assignedToMe}
        onAssignedToMeChange={setAssignedToMe}
      />

      <CreativeBoard
        orders={orders}
        loading={loading}
        search={search}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      <CreativeDetailDrawer
        open={drawerOpen}
        order={selectedOrder}
        loading={detailLoading}
        isAdmin={user?.role === 'admin'}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
