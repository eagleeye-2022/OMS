'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { OrderListPanel } from '@/components/orders/OrderListPanel'
import { OrderDetailPanel } from '@/components/orders/OrderDetailPanel'
import { CreateOrderModal } from '@/components/orders/CreateOrderModal'
import { useAuth } from '@/hooks/useAuth'
import type { IActivityLog, IOrder } from '@/types'

export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<IOrder[]>([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<IOrder | null>(null)

  const canCreate = user ? ['admin', 'sales'].includes(user.role) : false

  const loadList = useCallback(async (q = '', st = '', silent = false) => {
    if (!silent) setListLoading(true)
    try {
      const params = new URLSearchParams({ search: q, stage: st, limit: '50' })
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data)
        setTotal(data.total)
      }
    } finally {
      if (!silent) setListLoading(false)
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

  useEffect(() => { loadList() }, [loadList])
  useEffect(() => {
    const t = setTimeout(() => loadList(search, stage), 300)
    return () => clearTimeout(t)
  }, [search, stage, loadList])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const handleSelect = (order: IOrder) => setSelectedId(order._id)
  const handleCreate = () => { setEditingOrder(null); setModalOpen(true) }
  const handleEdit = () => { if (selectedOrder) { setEditingOrder(selectedOrder); setModalOpen(true) } }

  const handleModalSaved = () => {
    loadList(search, stage)
    if (selectedId) loadDetail(selectedId)
  }

  const handleRefresh = () => {
    if (selectedId) loadDetail(selectedId)
    // Silent: this fires after in-place detail actions (note/asset/team/status
    // updates) — the list still needs fresh data (balances, stage) but
    // shouldn't blank into a full skeleton for a change the user didn't make
    // in the list itself.
    loadList(search, stage, true)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Order Management</h1>
        <SearchBar
          className="flex-1 max-w-md"
          placeholder="Search by order no., client or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canCreate && (
          <Button icon={<Plus size={15} />} onClick={handleCreate}>Create Order</Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <OrderListPanel
          orders={orders}
          total={total}
          loading={listLoading}
          search={search}
          stage={stage}
          onStageChange={setStage}
          selectedId={selectedId}
          canViewFinance={user ? ['admin', 'sales', 'accounts'].includes(user.role) : false}
          onSelect={handleSelect}
        />
        <OrderDetailPanel
          order={selectedOrder}
          logs={logs}
          loading={detailLoading}
          // Neutral placeholder while useAuth() resolves — grants no special
          // action UI in this panel (unlike defaulting to 'sales'/'admin',
          // which would briefly flash an Edit Details button a restricted
          // user shouldn't see). The real role always wins once it loads.
          role={user?.role ?? 'accounts'}
          hasAnyOrders={total > 0}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
        />
      </div>

      <CreateOrderModal
        open={modalOpen}
        initialOrder={editingOrder}
        onClose={() => setModalOpen(false)}
        onSaved={handleModalSaved}
      />
    </div>
  )
}
