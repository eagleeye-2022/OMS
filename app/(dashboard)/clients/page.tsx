'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { ClientListPanel } from '@/components/clients/ClientListPanel'
import { ClientDetailPanel } from '@/components/clients/ClientDetailPanel'
import { ClientWizard } from '@/components/clients/ClientWizard'
import { useAuth } from '@/hooks/useAuth'
import type { IClient, IOrder } from '@/types'

export default function ClientsPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<IClient[]>([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedClient, setSelectedClient] = useState<IClient | null>(null)
  const [orders, setOrders] = useState<IOrder[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<IClient | null>(null)

  const canEdit = user ? ['admin', 'sales'].includes(user.role) : false
  const canDeactivate = user?.role === 'admin'

  // Tracks the most recently *requested* search/client id so an
  // out-of-order network response (e.g. a slower request for a client
  // clicked earlier arriving after a faster request for one clicked later)
  // can be detected and discarded instead of overwriting newer, correct data.
  const latestSearchRef = useRef('')
  const latestClientIdRef = useRef<string | undefined>(undefined)

  const loadList = useCallback(async (q = '') => {
    latestSearchRef.current = q
    setListLoading(true)
    try {
      // limit=200, matching every other list page (Orders/Accounts/Shipping/
      // Creative/Production) — see app/(dashboard)/orders/page.tsx's loadList
      // for the confirmed-live bug this same low-limit/no-pagination pattern
      // caused there once total records outgrew the old cap.
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=200`)
      const data = await res.json()
      if (latestSearchRef.current !== q) return // a newer search superseded this one
      if (data.success) {
        setClients(data.data)
        setTotal(data.total)
      }
    } finally {
      if (latestSearchRef.current === q) setListLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    latestClientIdRef.current = id
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      if (latestClientIdRef.current !== id) return // a newer selection superseded this one
      if (data.success) {
        setSelectedClient(data.data.client)
        setOrders(data.data.orders)
      }
    } finally {
      if (latestClientIdRef.current === id) setDetailLoading(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])
  useEffect(() => {
    const t = setTimeout(() => loadList(search), 300)
    return () => clearTimeout(t)
  }, [search, loadList])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const handleSelect = (client: IClient) => setSelectedId(client._id)

  const handleAddNew = () => { setEditingClient(null); setWizardOpen(true) }
  const handleEdit = () => { if (selectedClient) { setEditingClient(selectedClient); setWizardOpen(true) } }

  const handleToggleStatus = async () => {
    if (!selectedClient) return
    const nextStatus = selectedClient.status === 'inactive' ? 'active' : 'inactive'
    const res = await fetch(`/api/clients/${selectedClient._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    const data = await res.json()
    if (data.success) {
      loadList(search)
      loadDetail(selectedClient._id)
    }
  }

  const handleWizardSaved = () => {
    loadList(search)
    if (selectedId) loadDetail(selectedId)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">Client Management</h1>
        <SearchBar
          className="flex-1 max-w-md"
          placeholder="Search clients by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canEdit && (
          <Button icon={<Plus size={15} />} onClick={handleAddNew}>Add New Client</Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <ClientListPanel
          clients={clients}
          total={total}
          loading={listLoading}
          search={search}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        <ClientDetailPanel
          client={selectedClient}
          orders={orders}
          loading={detailLoading}
          canEdit={canEdit}
          canDeactivate={canDeactivate}
          hasAnyClients={total > 0}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      {wizardOpen && (
        <ClientWizard
          key={editingClient?._id ?? 'new'}
          open={wizardOpen}
          initialClient={editingClient}
          onClose={() => setWizardOpen(false)}
          onSaved={handleWizardSaved}
        />
      )}
    </div>
  )
}
