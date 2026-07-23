'use client'

import { getLeadTimeLabel, formatCurrency } from '@/lib/utils'
import { PRIORITY_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'
import type { IOrder, Priority } from '@/types'

interface OrderSpecsCardProps {
  order: IOrder
}

/**
 * "Product Details" — the shared specs card used by every module's
 * order-detail view (Orders, Creative, Production, Shipping), so this is the
 * one place that defines what a product's details look like. Unit Price and
 * Shipment rows only render when their underlying fields are present — the
 * server already strips finance/shipping fields for roles that shouldn't see
 * them (see lib/order-visibility.ts), so an absent field here means "not
 * visible to this role," not "not entered."
 */
export function OrderSpecsCard({ order }: OrderSpecsCardProps) {
  const unit = order.quantity === 1 ? 'pc' : 'pcs'
  const canViewFinance = order.totalAmount != null
  const unitPrice = canViewFinance && order.quantity > 0 ? order.totalAmount! / order.quantity : null
  const hasShipment = order.shipmentWeight != null || order.packageCount != null

  const rows: [string, React.ReactNode][] = [
    ['Product Category', order.category],
    ['Print Type / Description', order.productType],
    ['Quantity', `${order.quantity.toLocaleString()} ${unit === 'pc' ? 'Unit' : 'Units'}`],
    ['Size Breakdown', order.sizeBreakdown || '—'],
  ]

  if (unitPrice != null) {
    rows.push(['Unit Price (approx.)', formatCurrency(unitPrice)])
  }

  rows.push(['Lead Time', getLeadTimeLabel(order.deliveryDate, order.status)])
  rows.push(['Priority', <Badge key="priority" label={PRIORITY_LABEL[order.priority as Priority]} className={PRIORITY_COLOR[order.priority as Priority]} />])

  if (hasShipment) {
    rows.push(['Shipment', [
      order.shipmentWeight != null ? `${order.shipmentWeight} kg` : null,
      order.packageCount != null ? `${order.packageCount} package(s)` : null,
    ].filter(Boolean).join(' · ') || '—'])
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product Details</h3>
      <p className="text-sm text-gray-600 mb-4">
        {order.quantity.toLocaleString()} {unit} of {order.category}
        {order.productType ? ` — ${order.productType}` : ''}
        {order.sizeBreakdown ? `. Size breakdown: ${order.sizeBreakdown}` : ''}.
      </p>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label as string} className="flex justify-between items-start gap-4 text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
