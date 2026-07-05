'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [or, sr] = await Promise.all([
        fetch('/api/orders?limit=200').then((r) => r.json()),
        fetch('/api/accounts/summary').then((r) => r.json()),
      ])
      if (or.success) setOrders(or.data)
      if (sr.success) setSummary(sr.data)
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

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

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
