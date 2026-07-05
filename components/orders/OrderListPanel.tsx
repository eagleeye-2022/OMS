'use client'

import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatCurrency, formatDate, isOverdue } from '@/lib/utils'
import { ORDER_STAGE_BUCKET } from '@/lib/constants'
import type { IClient, IOrder, OrderStatus } from '@/types'

const STAGE_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'creative', label: 'Creative' },
  { value: 'production', label: 'Production' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'completed', label: 'Completed' },
]

const STAGE_BADGE_LABEL: Record<string, string> = {
  creative: 'Creative',
  production: 'Production',
  shipping: 'Shipping',
  completed: 'Completed',
}

const STAGE_BADGE_COLOR: Record<string, string> = {
  creative: 'bg-purple-100 text-purple-700',
  production: 'bg-amber-100 text-amber-700',
  shipping: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
}

function stageOf(status: OrderStatus): string {
  return ORDER_STAGE_BUCKET[status] || 'sales'
}

interface OrderListPanelProps {
  orders: IOrder[]
  total: number
  loading: boolean
  search: string
  stage: string
  onStageChange: (stage: string) => void
  selectedId?: string
  canViewFinance: boolean
  onSelect: (order: IOrder) => void
}

export function OrderListPanel({ orders, total, loading, search, stage, onStageChange, selectedId, canViewFinance, onSelect }: OrderListPanelProps) {
  return (
    <div className="w-full lg:w-96 lg:shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Active Orders</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{total}</span>
      </div>

      <div className="px-2 py-2 border-b border-gray-100 flex items-center gap-1 overflow-x-auto">
        {STAGE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => onStageChange(t.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
              stage === t.value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title={search ? 'No matching orders' : 'No orders yet'}
            description={search ? `No orders found for "${search}"` : 'Create your first order to get started.'}
          />
        ) : (
          orders.map((order) => {
            const client = order.client as IClient
            const delayed = order.status === 'delayed' || (isOverdue(order.deliveryDate) && !['delivered', 'cancelled'].includes(order.status))
            const bucket = stageOf(order.status)
            return (
              <button
                key={order._id}
                onClick={() => onSelect(order)}
                className={cn(
                  'w-full text-left px-4 py-3 border-l-2 border-b border-gray-50 transition-colors',
                  selectedId === order._id ? 'bg-blue-50 border-l-blue-600' : 'border-l-transparent hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">{order.orderNumber}</span>
                    <Badge label={STAGE_BADGE_LABEL[bucket] || 'Sales'} className={cn('shrink-0', STAGE_BADGE_COLOR[bucket] || 'bg-gray-100 text-gray-600')} />
                  </div>
                  <Badge
                    label={delayed ? 'Delayed' : 'On Time'}
                    className={cn('shrink-0', delayed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}
                  />
                </div>
                <p className="text-sm font-medium text-gray-800 mt-1 truncate">{client?.companyName || '—'}</p>
                <p className="text-xs text-gray-500 truncate">{order.productType} · {order.quantity.toLocaleString()} units</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">Del: {formatDate(order.deliveryDate)}</span>
                  {canViewFinance && order.totalAmount != null && (
                    <span className="text-xs text-gray-500">
                      Paid: <span className="text-green-600 font-medium">{formatCurrency(order.advancePaid || 0)}</span>
                      {' '}Due: <span className={(order.balanceDue || 0) > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{formatCurrency(order.balanceDue || 0)}</span>
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
