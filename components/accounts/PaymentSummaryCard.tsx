'use client'

import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PAYMENT_STATUS_COLOR } from '@/lib/constants'
import type { IOrder, PaymentStatus } from '@/types'

interface PaymentSummaryCardProps {
  order: IOrder
}

export function PaymentSummaryCard({ order }: PaymentSummaryCardProps) {
  if (order.totalAmount == null) return null

  const totalAmount = order.totalAmount
  const advancePaid = order.advancePaid ?? 0
  const balanceDue = order.balanceDue ?? 0
  const advancePct = totalAmount > 0 ? Math.round((advancePaid / totalAmount) * 100) : 0
  const balancePct = 100 - advancePct

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Summary</h3>
        {order.paymentStatus && (
          <Badge label={order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)} className={PAYMENT_STATUS_COLOR[order.paymentStatus as PaymentStatus]} />
        )}
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex mb-2">
        <div className="h-full bg-green-500" style={{ width: `${advancePct}%` }} />
        <div className="h-full bg-red-400" style={{ width: `${balancePct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {formatCurrency(advancePaid)} advance paid</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> {formatCurrency(balanceDue)} balance due</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Order Value</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Advance Paid</span>
          <div className="text-right">
            <span className="text-sm font-semibold text-green-600">{formatCurrency(advancePaid)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Balance Due</span>
          <div className="text-right">
            <span className={`text-sm font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balanceDue)}</span>
            {balanceDue > 0 && <p className="text-[11px] text-gray-400">Due {formatDate(order.deliveryDate)}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
