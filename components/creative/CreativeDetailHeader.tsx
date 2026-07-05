'use client'

import { AlertTriangle, Clock, X } from 'lucide-react'
import { CreativeStatusControl } from './CreativeStatusControl'
import { cn, getDaysUntilDeadline } from '@/lib/utils'
import type { IOrder } from '@/types'

interface CreativeDetailHeaderProps {
  order: IOrder
  onUpdated: () => void
  onClose?: () => void
}

export function CreativeDetailHeader({ order, onUpdated, onClose }: CreativeDetailHeaderProps) {
  const daysLeft = getDaysUntilDeadline(order.deliveryDate)
  const isDone = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{order.orderNumber}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <CreativeStatusControl order={order} onUpdated={onUpdated} />
          {!isDone && (
            <span className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium',
              daysLeft < 0 ? 'bg-red-50 text-red-600' : daysLeft <= 2 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
            )}>
              {daysLeft < 0 ? <AlertTriangle size={12} /> : <Clock size={12} />}
              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days to deadline`}
            </span>
          )}
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X size={18} />
        </button>
      )}
    </div>
  )
}
