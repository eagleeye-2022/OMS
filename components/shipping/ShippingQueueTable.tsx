'use client'

import { AlertTriangle } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatDate } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/constants'
import type { IClient, IOrder, OrderStatus } from '@/types'

interface ShippingQueueTableProps {
  orders: IOrder[]
  loading: boolean
  search: string
  selectedId?: string
  onSelect: (order: IOrder) => void
}

export function ShippingQueueTable({ orders, loading, search, selectedId, onSelect }: ShippingQueueTableProps) {
  if (!loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <EmptyState
          title={search ? 'No matching orders' : 'No orders in the shipping pipeline'}
          description={search ? `No orders found for "${search}"` : 'Orders will appear here once production hands them off as shipping ready.'}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Shipping Queue</h2>
        <span className="text-xs text-gray-400">Showing {orders.length} orders</span>
      </div>
      <DataTable
        loading={loading}
        data={orders as unknown as Record<string, unknown>[]}
        keyField="_id"
        emptyMessage="No orders in the shipping pipeline"
        onRowClick={(row) => onSelect(row as unknown as IOrder)}
        columns={[
          {
            key: 'orderNumber', header: 'Order', render: (row) => (
              <span className={cn('text-sm font-bold', selectedId === row._id ? 'text-blue-600' : 'text-gray-900')}>{row.orderNumber as string}</span>
            ),
          },
          {
            key: 'client', header: 'Client', render: (row) => {
              const client = row.client as IClient
              return <span className="text-sm text-gray-800">{client?.companyName || '—'}</span>
            },
          },
          {
            key: 'courierPartner', header: 'Courier', render: (row) => (
              <span className="text-sm text-gray-600">{(row.courierPartner as string) || '—'}</span>
            ),
          },
          {
            key: 'trackingNumber', header: 'Tracking #', render: (row) => (
              <span className="text-sm text-gray-600">{(row.trackingNumber as string) || '—'}</span>
            ),
          },
          {
            key: 'dispatchDate', header: 'Dispatched', render: (row) => (
              <span className="text-sm text-gray-500">{formatDate(row.dispatchDate as string | undefined)}</span>
            ),
          },
          {
            key: 'expectedDeliveryDate', header: 'Expected Delivery', render: (row) => (
              <span className="text-sm text-gray-500">{formatDate(row.expectedDeliveryDate as string | undefined)}</span>
            ),
          },
          {
            key: 'status', header: 'Status', render: (row) => {
              const order = row as unknown as IOrder
              const dispatchBlocked = order.status === 'shipping_ready' && Boolean(order.dispatchBlockedReason)
              return (
                <div className="flex items-center gap-1.5">
                  <Badge label={ORDER_STATUS_LABEL[order.status]} className={ORDER_STATUS_COLOR[order.status]} />
                  {dispatchBlocked && (
                    <span title={order.dispatchBlockedReason ?? undefined} className="flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle size={12} /> Blocked
                    </span>
                  )}
                </div>
              )
            },
          },
        ]}
      />
    </div>
  )
}
