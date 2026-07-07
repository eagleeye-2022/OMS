'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { OrderDetailPanel } from '@/components/orders/OrderDetailPanel'
import { CreateOrderModal } from '@/components/orders/CreateOrderModal'
import { useAuth } from '@/hooks/useAuth'
import type { IActivityLog, IOrder } from '@/types'

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [order, setOrder] = useState<IOrder | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (data.success) {
        setOrder(data.data.order)
        setLogs(data.data.logs)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Order Detail</h1>
      </div>

      <OrderDetailPanel
        order={order}
        logs={logs}
        loading={loading}
        // See app/(dashboard)/orders/page.tsx for why this defaults to a
        // no-special-privilege role rather than 'sales'/'admin'.
        role={user?.role ?? 'accounts'}
        onEdit={() => setModalOpen(true)}
        onRefresh={load}
      />

      {modalOpen && (
        <CreateOrderModal
          open={modalOpen}
          initialOrder={order}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
