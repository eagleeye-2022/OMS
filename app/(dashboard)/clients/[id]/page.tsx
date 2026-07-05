'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ClientDetailPanel } from '@/components/clients/ClientDetailPanel'
import { ClientWizard } from '@/components/clients/ClientWizard'
import { useAuth } from '@/hooks/useAuth'
import type { IClient, IOrder } from '@/types'

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [client, setClient] = useState<IClient | null>(null)
  const [orders, setOrders] = useState<IOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)

  const canEdit = user ? ['admin', 'sales'].includes(user.role) : false
  const canDeactivate = user?.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      if (data.success) {
        setClient(data.data.client)
        setOrders(data.data.orders)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleToggleStatus = async () => {
    if (!client) return
    const nextStatus = client.status === 'inactive' ? 'active' : 'inactive'
    const res = await fetch(`/api/clients/${client._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    const data = await res.json()
    if (data.success) load()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Client Profile</h1>
      </div>

      <ClientDetailPanel
        client={client}
        orders={orders}
        loading={loading}
        canEdit={canEdit}
        canDeactivate={canDeactivate}
        onEdit={() => setWizardOpen(true)}
        onToggleStatus={handleToggleStatus}
      />

      <ClientWizard
        open={wizardOpen}
        initialClient={client}
        onClose={() => setWizardOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
