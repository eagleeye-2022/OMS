'use client'

import { getLeadTimeLabel } from '@/lib/utils'
import { PRIORITY_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'
import type { IOrder, Priority } from '@/types'

interface ShippingOrderSummaryCardProps {
  order: IOrder
}

export function ShippingOrderSummaryCard({ order }: ShippingOrderSummaryCardProps) {
  // Same field set/labels/order as the Orders module's OrderSpecsCard, for a
  // consistent "Order Specifications" section across modules — plus Priority
  // and Shipment, which are Shipping-specific and not shown elsewhere in this panel.
  const rows: [string, React.ReactNode][] = [
    ['Product Category', order.category],
    ['Print Type', order.productType],
    ['Quantity', `${order.quantity.toLocaleString()} Units`],
    ['Size Breakdown', order.sizeBreakdown || '—'],
    ['Lead Time', getLeadTimeLabel(order.deliveryDate, order.status)],
    ['Priority', <Badge key="priority" label={PRIORITY_LABEL[order.priority as Priority]} className={PRIORITY_COLOR[order.priority as Priority]} />],
  ]

  if (order.shipmentWeight != null || order.packageCount != null) {
    rows.push(['Shipment', [
      order.shipmentWeight != null ? `${order.shipmentWeight} kg` : null,
      order.packageCount != null ? `${order.packageCount} package(s)` : null,
    ].filter(Boolean).join(' · ') || '—'])
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Specifications</h3>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {rows.map(([label, value]) => (
          <div key={label as string}>
            <p className="text-xs text-gray-400">{label}</p>
            <div className="text-sm font-medium text-gray-900">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
