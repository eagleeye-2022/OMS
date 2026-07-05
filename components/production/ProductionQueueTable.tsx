'use client'

import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, getDaysUntilDeadline } from '@/lib/utils'
import { PRODUCTION_STAGE_KEYS, PRODUCTION_STAGE_KEY_LABEL, PRODUCTION_STAGE_STATUS_LABEL, PRODUCTION_STAGE_STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import type { IClient, IOrder, IUser } from '@/types'

interface ProductionQueueTableProps {
  orders: IOrder[]
  loading: boolean
  search: string
  selectedId?: string
  onSelect: (order: IOrder) => void
}

export function ProductionQueueTable({ orders, loading, search, selectedId, onSelect }: ProductionQueueTableProps) {
  if (!loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <EmptyState
          title={search ? 'No matching orders' : 'No orders in production'}
          description={search ? `No orders found for "${search}"` : 'Orders will appear here once their design is approved.'}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Active Orders</h2>
        <span className="text-xs text-gray-400">Showing {orders.length} active batches</span>
      </div>
      <DataTable
        loading={loading}
        data={orders as unknown as Record<string, unknown>[]}
        keyField="_id"
        emptyMessage="No orders in production"
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
            key: 'product', header: 'Product', render: (row) => (
              <span className="text-sm text-gray-600">{row.productType as string}</span>
            ),
          },
          { key: 'quantity', header: 'Qty', render: (row) => <span className="text-sm">{(row.quantity as number).toLocaleString()}</span> },
          ...PRODUCTION_STAGE_KEYS.map((key) => ({
            key,
            header: PRODUCTION_STAGE_KEY_LABEL[key],
            render: (row: Record<string, unknown>) => {
              const order = row as unknown as IOrder
              const stage = order.productionStages[key]
              return <Badge label={PRODUCTION_STAGE_STATUS_LABEL[stage.status].toUpperCase()} className={PRODUCTION_STAGE_STATUS_COLOR[stage.status]} />
            },
          })),
          {
            key: 'priority', header: 'Priority', render: (row) => (
              <Badge label={PRIORITY_LABEL[row.priority as keyof typeof PRIORITY_LABEL].toUpperCase()} className={PRIORITY_COLOR[row.priority as keyof typeof PRIORITY_COLOR]} />
            ),
          },
          {
            key: 'deliveryDate', header: 'Deadline', render: (row) => {
              const daysLeft = getDaysUntilDeadline(row.deliveryDate as string)
              return (
                <span className={cn('text-sm font-medium', daysLeft < 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-amber-600' : 'text-gray-500')}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                </span>
              )
            },
          },
          {
            key: 'assignee', header: '', width: '48px', render: (row) => {
              const assignee = (row as unknown as IOrder).assignedTeam?.productionManager as IUser | string | undefined
              const name = assignee && typeof assignee !== 'string' ? assignee.name : undefined
              return name ? <Avatar name={name} size="sm" /> : null
            },
          },
        ]}
      />
    </div>
  )
}
