'use client'

import { PackageCheck, Truck, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { SHIPPING_SUMMARY_KEYS, SHIPPING_SUMMARY_LABEL, summaryCounts, type ShippingSummaryKey } from './types'
import type { IOrder } from '@/types'

const CARD_ICON: Record<ShippingSummaryKey, React.ReactNode> = {
  shipping_ready: <PackageCheck size={16} />,
  dispatched: <Truck size={16} />,
  in_transit: <MapPin size={16} />,
  delayed: <AlertTriangle size={16} />,
  delivered: <CheckCircle2 size={16} />,
}

const CARD_ICON_BG: Record<ShippingSummaryKey, string> = {
  shipping_ready: 'bg-teal-50 text-teal-600',
  dispatched: 'bg-cyan-50 text-cyan-600',
  in_transit: 'bg-sky-50 text-sky-600',
  delayed: 'bg-red-50 text-red-600',
  delivered: 'bg-green-50 text-green-600',
}

interface ShippingSummaryCardsProps {
  orders: IOrder[]
}

export function ShippingSummaryCards({ orders }: ShippingSummaryCardsProps) {
  const counts = summaryCounts(orders)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {SHIPPING_SUMMARY_KEYS.map((key) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">{SHIPPING_SUMMARY_LABEL[key]}</p>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${CARD_ICON_BG[key]}`}>{CARD_ICON[key]}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
        </div>
      ))}
    </div>
  )
}
