'use client'

import { CreativeColumn } from './CreativeColumn'
import { EmptyState } from '@/components/ui/EmptyState'
import { CREATIVE_BOARD_COLUMNS } from '@/lib/constants'
import { groupOrdersByColumn } from './types'
import type { IOrder } from '@/types'

interface CreativeBoardProps {
  orders: IOrder[]
  loading: boolean
  search: string
  selectedId?: string
  onSelect: (order: IOrder) => void
}

export function CreativeBoard({ orders, loading, search, selectedId, onSelect }: CreativeBoardProps) {
  if (loading) {
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        {CREATIVE_BOARD_COLUMNS.map((col) => (
          <div key={col} className="w-full sm:w-72 shrink-0 space-y-2">
            <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <EmptyState
          title={search ? 'No matching orders' : 'No orders in the creative queue'}
          description={search ? `No orders found for "${search}"` : 'Orders will appear here once they enter the design stage.'}
        />
      </div>
    )
  }

  const groups = groupOrdersByColumn(orders)

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:overflow-x-auto sm:pb-2">
      {CREATIVE_BOARD_COLUMNS.map((col) => (
        <CreativeColumn key={col} column={col} orders={groups[col]} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  )
}
