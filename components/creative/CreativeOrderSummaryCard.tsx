'use client'

import { formatDate } from '@/lib/utils'
import type { IClient, IOrder } from '@/types'

interface CreativeOrderSummaryCardProps {
  order: IOrder
}

export function CreativeOrderSummaryCard({ order }: CreativeOrderSummaryCardProps) {
  const client = order.client as IClient

  const rows: [string, string][] = [
    ['Client', client?.companyName || '—'],
    ['Quantity', `${order.quantity.toLocaleString()} pcs`],
    ['Print Type', order.productType],
    ['Category', order.category],
    ['Sizes', order.sizeBreakdown || '—'],
    ['Delivery Date', formatDate(order.deliveryDate)],
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Summary</h3>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
