'use client'

import { CreativeOrderCard } from './CreativeOrderCard'
import { CREATIVE_BOARD_COLUMN_LABEL, type CreativeBoardColumn } from '@/lib/constants'
import type { IOrder } from '@/types'

const COLUMN_ACCENT: Record<CreativeBoardColumn, string> = {
  design_pending: 'border-t-amber-400',
  in_progress: 'border-t-blue-400',
  awaiting_approval: 'border-t-purple-400',
  approved: 'border-t-green-400',
}

interface CreativeColumnProps {
  column: CreativeBoardColumn
  orders: IOrder[]
  selectedId?: string
  onSelect: (order: IOrder) => void
}

export function CreativeColumn({ column, orders, selectedId, onSelect }: CreativeColumnProps) {
  return (
    <div className="flex flex-col w-full sm:w-72 shrink-0 bg-gray-50 rounded-xl border border-gray-200">
      <div className={`flex items-center justify-between px-3 py-2.5 border-t-2 rounded-t-xl ${COLUMN_ACCENT[column]}`}>
        <h3 className="text-sm font-semibold text-gray-900">{CREATIVE_BOARD_COLUMN_LABEL[column]}</h3>
        <span className="text-xs bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{orders.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-24 max-h-[65vh] overflow-y-auto">
        {orders.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No orders here</p>
        ) : (
          orders.map((order) => (
            <CreativeOrderCard key={order._id} order={order} selected={selectedId === order._id} onClick={() => onSelect(order)} />
          ))
        )}
      </div>
    </div>
  )
}
