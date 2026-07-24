'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ShippingDetailPage } from '@/components/shipping/ShippingDetailPage'
import { useAuth } from '@/hooks/useAuth'
import { isShippingAllowedEmail } from '@/lib/constants'
import type { IActivityLog, IOrder } from '@/types'

export default function ShippingDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [order, setOrder] = useState<IOrder | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [loading, setLoading] = useState(true)

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

  const isAdmin = user?.role === 'admin'
  // 'operations' now has full Shipping write access — see the matching
  // comment in app/(dashboard)/shipping/page.tsx for the full rationale.
  const canEditShipping = user?.role === 'admin' || user?.role === 'sales' || user?.role === 'accounting' || user?.role === 'operations' || isShippingAllowedEmail(user?.email)

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/shipping" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Shipping Detail</h1>
      </div>

      <ShippingDetailPage order={order} logs={logs} loading={loading} canEditShipping={canEditShipping} isAdmin={isAdmin} onUpdated={load} />
    </div>
  )
}
