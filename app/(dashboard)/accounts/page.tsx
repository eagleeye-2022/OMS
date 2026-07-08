'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AccountsHeader } from '@/components/accounts/AccountsHeader'
import { AccountsSummaryCards } from '@/components/accounts/AccountsSummaryCards'
import { OutstandingPaymentsTable } from '@/components/accounts/OutstandingPaymentsTable'
import { InvoiceManagementTable } from '@/components/accounts/InvoiceManagementTable'
import { AccountsDetailDrawer } from '@/components/accounts/AccountsDetailDrawer'
import { RecordPaymentModal } from '@/components/accounts/RecordPaymentModal'
import { InvoiceUploadModal } from '@/components/accounts/InvoiceUploadModal'
import { InvoicePreviewModal } from '@/components/accounts/InvoicePreviewModal'
import { OverdueReminderModal } from '@/components/accounts/OverdueReminderModal'
import type { IActivityLog, IClient, IOrder } from '@/types'

interface AccountsSummary {
  totalBilled: number
  totalCollected: number
  balanceOutstanding: number
  overdueAmount: number
  overdueCount: number
  advanceCollected: number
  invoicesPending: number
}

export default function AccountsPage() {
  const [orders, setOrders] = useState<IOrder[]>([])
  const [summary, setSummary] = useState<AccountsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [uploadOrder, setUploadOrder] = useState<IOrder | null>(null)
  const [previewOrder, setPreviewOrder] = useState<IOrder | null>(null)
  const [reminderOrder, setReminderOrder] = useState<IOrder | null>(null)

  // Track the most recently *issued* request for each async path so an
  // out-of-order response (e.g. a slower load() call from an earlier action
  // arriving after a faster one from a later action) can be detected and
  // discarded instead of overwriting newer, correct data. `load()` has no
  // natural key (it always re-fetches the same full list+summary), so it
  // uses a simple incrementing generation counter instead of an id/search key.
  const loadGenerationRef = useRef(0)
  const latestOrderIdRef = useRef<string | undefined>(undefined)
  const latestPreviewIdRef = useRef<string | undefined>(undefined)

  const load = useCallback(async (silent = false) => {
    const generation = ++loadGenerationRef.current
    if (!silent) setLoading(true)
    try {
      const [or, sr] = await Promise.all([
        // excludeCancelled: Due Payments / All Invoices are active-receivables
        // tables, not a cancellation history — matches the same rule already
        // applied by /api/accounts/summary so the KPI cards and these tables
        // can never disagree about which orders are "real" outstanding money.
        fetch('/api/orders?limit=200&excludeCancelled=true').then((r) => r.json()),
        fetch('/api/accounts/summary').then((r) => r.json()),
      ])
      if (loadGenerationRef.current !== generation) return // a newer load() call superseded this one
      if (or.success) setOrders(or.data)
      if (sr.success) setSummary(sr.data)
    } finally {
      if (!silent && loadGenerationRef.current === generation) setLoading(false)
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

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  // Keeps latestPreviewIdRef in sync with whichever order the preview modal
  // is showing right now, regardless of which handler changed it, so
  // refreshPreviewOrder's own stale-response guard always compares against
  // the currently-intended order.
  useEffect(() => {
    latestPreviewIdRef.current = previewOrder?._id
  }, [previewOrder])

  const handleSelect = (order: IOrder) => {
    setSelectedId(order._id)
    setDrawerOpen(true)
  }

  const handleUpdated = () => {
    if (selectedId) loadDetail(selectedId)
    load(true)
  }

  const refreshPreviewOrder = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${id}`)
    const data = await res.json()
    if (latestPreviewIdRef.current !== id) return // the preview switched to a different order since this was requested
    if (data.success) setPreviewOrder(data.data.order)
  }, [])

  const q = search.trim().toLowerCase()
  const filteredOrders = q
    ? orders.filter((o) => {
        const client = o.client as IClient
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
          client?.companyName?.toLowerCase().includes(q)
        )
      })
    : orders

  return (
    <div className="p-6 space-y-5">
      <AccountsHeader search={search} onSearchChange={setSearch} onRecordPayment={() => setRecordModalOpen(true)} />

      <AccountsSummaryCards summary={summary} />

      <OutstandingPaymentsTable orders={filteredOrders} loading={loading} onSelect={handleSelect} />

      <InvoiceManagementTable
        orders={filteredOrders}
        loading={loading}
        onSelect={handleSelect}
        onUpload={(order) => setUploadOrder(order)}
        onPreview={(order) => setPreviewOrder(order)}
      />

      <AccountsDetailDrawer
        open={drawerOpen}
        order={selectedOrder}
        logs={logs}
        loading={detailLoading}
        onClose={() => setDrawerOpen(false)}
        onUpdated={handleUpdated}
        onUpload={(order) => setUploadOrder(order)}
        onPreview={(order) => setPreviewOrder(order)}
        onRemind={(order) => setReminderOrder(order)}
      />

      <RecordPaymentModal
        open={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSaved={handleUpdated}
      />

      <InvoiceUploadModal
        order={uploadOrder}
        onClose={() => setUploadOrder(null)}
        onSaved={() => { setUploadOrder(null); handleUpdated() }}
      />

      <InvoicePreviewModal
        order={previewOrder}
        onClose={() => setPreviewOrder(null)}
        onReplace={(order) => { setPreviewOrder(null); setUploadOrder(order) }}
        onUpdated={() => {
          load(true)
          if (selectedId) loadDetail(selectedId)
          if (previewOrder) refreshPreviewOrder(previewOrder._id)
        }}
      />

      <OverdueReminderModal order={reminderOrder} onClose={() => setReminderOrder(null)} />
    </div>
  )
}
