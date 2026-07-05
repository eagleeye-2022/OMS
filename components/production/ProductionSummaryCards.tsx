'use client'

import { Printer, Wand2, Sparkles, ShieldCheck } from 'lucide-react'
import { PRODUCTION_STAGE_KEYS, PRODUCTION_STAGE_KEY_LABEL, type ProductionStageKey } from '@/lib/constants'
import { stageCounts } from './types'
import type { IOrder } from '@/types'

const STAGE_ICON: Record<ProductionStageKey, React.ReactNode> = {
  printing: <Printer size={16} />,
  stitching: <Wand2 size={16} />,
  finishing: <Sparkles size={16} />,
  qcCheck: <ShieldCheck size={16} />,
}

const STAGE_ACCENT: Record<ProductionStageKey, string> = {
  printing: 'bg-amber-500',
  stitching: 'bg-blue-500',
  finishing: 'bg-purple-500',
  qcCheck: 'bg-green-500',
}

const STAGE_ICON_BG: Record<ProductionStageKey, string> = {
  printing: 'bg-amber-50 text-amber-600',
  stitching: 'bg-blue-50 text-blue-600',
  finishing: 'bg-purple-50 text-purple-600',
  qcCheck: 'bg-green-50 text-green-600',
}

interface ProductionSummaryCardsProps {
  orders: IOrder[]
}

export function ProductionSummaryCards({ orders }: ProductionSummaryCardsProps) {
  const counts = stageCounts(orders)
  const max = Math.max(1, ...PRODUCTION_STAGE_KEYS.map((k) => counts[k]))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {PRODUCTION_STAGE_KEYS.map((key) => (
        <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">{PRODUCTION_STAGE_KEY_LABEL[key]}</p>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${STAGE_ICON_BG[key]}`}>{STAGE_ICON[key]}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
          <p className="text-xs text-gray-400 mb-2">Batches</p>
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div className={`h-full rounded-full ${STAGE_ACCENT[key]}`} style={{ width: `${(counts[key] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
