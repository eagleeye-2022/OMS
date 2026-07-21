'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Tracks the most recently *requested* list query / order id so an
  // out-of-order network response (e.g. a slower request for a search typed
  // earlier, or an order clicked earlier, arriving after a faster/newer one)
  // can be detected and discarded instead of overwriting newer, correct data.
  const latestListKeyRef = useRef('')
  const latestOrderIdRef = useRef<string | undefined>(undefined)

  const loadList = useCallback(async (q = '', st = '', silent = false) => {
    const key = `${q}::${st}`
    latestListKeyRef.current = key
    if (!silent) setListLoading(true)
    try {
      // limit=200 matches every other list page in the app (Accounts, Shipping,
      // Creative, Production) — Orders was the one page left at a much lower
      // cap with zero pagination UI to reach anything past it. Once total
      // orders passed 50, any order whose nearest deadline wasn't among the
      // most urgent silently fell outside this fetch and was unreachable from
      // the list (confirmed live: a freshly created order ranked outside the
      // old 50-item window while its DB record, client link, and status were
      // all correct — this was a visibility ceiling, not a data bug).
      const params = new URLSearchParams({ search: q, stage: st, limit: '200' })
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      if (latestListKeyRef.current !== key) return // a newer search/filter superseded this one
      if (data.success) {
        setOrders(data.data)
        setTotal(data.total)
      }
    } finally {
      if (!silent && latestListKeyRef.current === key) setListLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    latestOrderIdRef.current = id
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (latestOrderIdRef.current !== id) return // a newer selection superseded this one
      if (data.success) {
        setSelectedOrder(data.data.order)
        setLogs(data.data.logs)
      }
    } finally {
      if (latestOrderIdRef.current === id) setDetailLoading(false)
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

  useEffect(() => {
    if (searchParams.get('new') === '1' && canCreate) {
      handleCreate()
      router.replace('/orders')
    }
    // Only ever consume the `?new=1` deep link (from the dashboard's quick-add
    // button) once per navigation — re-running on every dep change would
    // reopen the modal right after the user closes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canCreate])

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
          canViewFinance={user ? ['admin', 'sales', 'accounting'].includes(user.role) : false}
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
          role={user?.role ?? 'accounting'}
          hasAnyOrders={total > 0}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
        />
      </div>

      {modalOpen && (
        <CreateOrderModal
          key={editingOrder?._id ?? 'new'}
          open={modalOpen}
          initialOrder={editingOrder}
          onClose={() => setModalOpen(false)}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  )
}
