'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CreativeDetailPage } from '@/components/creative/CreativeDetailPage'
import { useAuth } from '@/hooks/useAuth'
import type { IOrder } from '@/types'

export default function CreativeQueueDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/creative-queue" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Creative Queue Details</h1>
      </div>

      <CreativeDetailPage order={order} loading={loading} isAdmin={user?.role === 'admin'} onUpdated={load} />
    </div>
  )
}
