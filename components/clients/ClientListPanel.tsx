'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_COLOR } from '@/lib/constants'
import type { IClient } from '@/types'

interface ClientListPanelProps {
  clients: IClient[]
  total: number
  loading: boolean
  search: string
  selectedId?: string
  onSelect: (client: IClient) => void
}

export function ClientListPanel({ clients, total, loading, search, selectedId, onSelect }: ClientListPanelProps) {
  return (
    <div className="w-full lg:w-80 lg:shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">All Clients</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{total} clients</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            title={search ? 'No matching clients' : 'No clients yet'}
            description={search ? `No clients found for "${search}"` : 'Add your first client to get started.'}
          />
        ) : (
          clients.map((client) => (
            <button
              key={client._id}
              onClick={() => onSelect(client)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left border-l-2 transition-colors',
                selectedId === client._id ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50'
              )}
            >
              <Avatar name={client.companyName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{client.companyName}</p>
                <p className="text-xs text-gray-500">
                  {client.activeOrders != null ? `${client.activeOrders} active order${client.activeOrders === 1 ? '' : 's'}` : '—'}
                </p>
              </div>
              {client.status !== 'active' && (
                <Badge label={CLIENT_STATUS_LABEL[client.status]} className={cn('shrink-0', CLIENT_STATUS_COLOR[client.status])} />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
