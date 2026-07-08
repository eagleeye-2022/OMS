'use client'

import { AlertTriangle, Clock, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn, getDaysUntilDeadline } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, getProductionWorkflowState, PRODUCTION_WORKFLOW_STATE_LABEL, PRODUCTION_WORKFLOW_STATE_COLOR } from '@/lib/constants'
import type { IOrder, OrderStatus } from '@/types'

interface ProductionDetailHeaderProps {
  order: IOrder
  onClose?: () => void
}

export function ProductionDetailHeader({ order, onClose }: ProductionDetailHeaderProps) {
  const daysLeft = getDaysUntilDeadline(order.deliveryDate)
  const isDone = order.status === 'delivered' || order.status === 'cancelled'
  const workflowState = getProductionWorkflowState(order.status as OrderStatus)

  return (
    <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{order.orderNumber}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge label={PRODUCTION_WORKFLOW_STATE_LABEL[workflowState]} className={PRODUCTION_WORKFLOW_STATE_COLOR[workflowState]} />
          <Badge label={ORDER_STATUS_LABEL[order.status as OrderStatus]} className={ORDER_STATUS_COLOR[order.status as OrderStatus]} />
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
