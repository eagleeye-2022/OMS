'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProductionDetailPage } from '@/components/production/ProductionDetailPage'
import { useAuth } from '@/hooks/useAuth'
import type { IOrder } from '@/types'

export default function ProductionDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [order, setOrder] = useState<IOrder | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${id}`)
      const data = await res.json()
      if (data.success) setOrder(data.data.order)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const isAdmin = user?.role === 'admin'
  const canEditStages = user?.role === 'admin' || user?.role === 'operations'

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/production" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Production Detail</h1>
      </div>

      <ProductionDetailPage order={order} loading={loading} isAdmin={isAdmin} canEditStages={canEditStages} currentUserId={user?.id} onUpdated={load} />
    </div>
  )
}
