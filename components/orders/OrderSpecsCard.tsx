'use client'

import { getDaysUntilDeadline } from '@/lib/utils'
import type { IOrder } from '@/types'

interface OrderSpecsCardProps {
  order: IOrder
}

export function OrderSpecsCard({ order }: OrderSpecsCardProps) {
  const daysLeft = getDaysUntilDeadline(order.deliveryDate)
  const leadTime = order.status === 'delivered' || order.status === 'cancelled'
    ? '—'
    : daysLeft >= 0 ? `${daysLeft} Days Remaining` : `${Math.abs(daysLeft)} Days Overdue`

  const rows: [string, string][] = [
    ['Product Category', order.category],
    ['Print Type', order.productType],
    ['Quantity', `${order.quantity.toLocaleString()} Units`],
    ['Size Breakdown', order.sizeBreakdown || '—'],
    ['Lead Time', leadTime],
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Specifications</h3>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-start gap-4 text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
