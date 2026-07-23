'use client'

import { Mail, Phone, MapPin, FileText, Pencil, Power, PowerOff } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/DataTable'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_COLOR, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/constants'
import type { IClient, IOrder, OrderStatus } from '@/types'

interface ClientDetailPanelProps {
  client: IClient | null
  orders: IOrder[]
  loading: boolean
  canEdit: boolean
  canDeactivate: boolean
  /** Whether the client list (under current filters) has at least one client — lets the empty state distinguish "nothing selected yet" from "nothing exists yet". Defaults to true for standalone/deep-link usage. */
  hasAnyClients?: boolean
  onEdit: () => void
  onToggleStatus: () => void
  onViewAllHistory?: () => void
}

export function ClientDetailPanel({ client, orders, loading, canEdit, canDeactivate, hasAnyClients = true, onEdit, onToggleStatus, onViewAllHistory }: ClientDetailPanelProps) {
  if (loading) return <div className="bg-white rounded-xl border border-gray-200 flex-1 w-full"><PageLoader /></div>

  if (!client) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 flex-1 w-full flex items-center justify-center min-h-64">
        {hasAnyClients ? (
          <EmptyState title="Select a client" description="Choose a client from the list to view their profile." />
        ) : (
          <EmptyState title="No clients yet" description="Add your first client to get started." />
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 w-full space-y-5 min-w-0">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <Avatar name={client.companyName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 truncate">{client.companyName}</h2>
              <Badge label={CLIENT_STATUS_LABEL[client.status]} className={CLIENT_STATUS_COLOR[client.status]} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Client since {formatDate(client.createdAt)} · {client.clientCode}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <button onClick={onEdit} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="Edit client">
                <Pencil size={15} />
              </button>
            )}
            {canDeactivate && (
              <button
                onClick={onToggleStatus}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                title={client.status === 'inactive' ? 'Reactivate client' : 'Deactivate client'}
              >
                {client.status === 'inactive' ? <Power size={15} /> : <PowerOff size={15} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={client.totalOrders ?? 0} />
        <StatCard label="Overall Business" value={formatCurrency(client.lifetimeBusiness ?? 0)} />
        <StatCard label="Last Order" value={client.lastOrderDate ? formatDate(client.lastOrderDate) : '—'} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-2 text-sm">
            <Phone size={15} className="text-gray-400 mt-0.5 shrink-0" />
            <div><p className="text-xs text-gray-400">Phone</p><p className="text-gray-800">{client.phone || '—'}</p></div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Mail size={15} className="text-gray-400 mt-0.5 shrink-0" />
            <div><p className="text-xs text-gray-400">Email</p><p className="text-gray-800">{client.email || '—'}</p></div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">City</p>
              <p className="text-gray-800">{client.billingAddress?.city ? `${client.billingAddress.city}, ${client.billingAddress.state || ''}` : '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <FileText size={15} className="text-gray-400 mt-0.5 shrink-0" />
            <div><p className="text-xs text-gray-400">GST No.</p><p className="text-gray-800">{client.gstNumber || '—'}</p></div>
          </div>
        </div>
      </div>

      {client.typicalOrderValue != null && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Billing Details</h3>
          <p className="text-xs text-gray-400 mb-3">
            A sales-reference estimate, not an actual order total — orders are created and priced in the Orders module.
          </p>
          <div>
            <p className="text-xs text-gray-400">Typical Order Value</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(client.typicalOrderValue)}</p>
          </div>
        </div>
      )}

      {(client.productPreferences?.length > 0 || client.deliveryDate) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900">Order Preferences</h3>
            {client.deliveryDate && (
              <span className="text-xs text-gray-500">Expected by {formatDate(client.deliveryDate)}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Captured during onboarding — each of these was created as a real order, visible below in Order History.
          </p>
          <div className="space-y-3">
            {client.productPreferences.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-4 text-sm border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{p.preferredProductCategory || '—'}</p>
                  {p.orderNote && <p className="text-xs text-gray-500 mt-0.5">{p.orderNote}</p>}
                </div>
                <p className="text-gray-700 shrink-0">{p.orderQuantity ? `${p.orderQuantity.toLocaleString()} units` : '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Order History</h3>
          {onViewAllHistory && orders.length > 0 && (
            <button onClick={onViewAllHistory} className="text-xs font-medium text-blue-600 hover:underline">View All History</button>
          )}
        </div>
        <DataTable
          data={orders as unknown as Record<string, unknown>[]}
          keyField="_id"
          emptyMessage="No orders for this client yet"
          columns={[
            {
              key: 'orderNumber', header: 'Order No.', render: row => (
                <a href={`/orders/${row._id as string}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                  {row.orderNumber as string}
                </a>
              )
            },
            { key: 'category', header: 'Product', render: row => <span className="text-sm">{row.category as string}</span> },
            { key: 'quantity', header: 'Qty', render: row => <span className="text-sm">{(row.quantity as number).toLocaleString()}</span> },
            { key: 'createdAt', header: 'Order Date', render: row => <span className="text-sm text-gray-500">{formatDate(row.createdAt as string)}</span> },
            { key: 'totalAmount', header: 'Value', render: row => <span className="text-sm font-medium">{formatCurrency(row.totalAmount as number)}</span> },
            {
              key: 'status', header: 'Status',
              render: row => <Badge label={ORDER_STATUS_LABEL[row.status as OrderStatus] || String(row.status)} className={ORDER_STATUS_COLOR[row.status as OrderStatus]} />
            },
          ]}
        />
      </div>
    </div>
  )
}
