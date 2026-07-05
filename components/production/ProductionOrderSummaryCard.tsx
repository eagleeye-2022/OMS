'use client'

import { ExternalLink, Cloud } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { IClient, IOrder } from '@/types'

interface ProductionOrderSummaryCardProps {
  order: IOrder
}

export function ProductionOrderSummaryCard({ order }: ProductionOrderSummaryCardProps) {
  const client = order.client as IClient
  const assetsFolder = order.assets.find((a) => a.kind === 'drive_link')

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
      {assetsFolder && (
        <a
          href={assetsFolder.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm text-blue-600 hover:underline"
        >
          <Cloud size={15} /> {assetsFolder.label} <ExternalLink size={12} />
        </a>
      )}
    </div>
  )
}
