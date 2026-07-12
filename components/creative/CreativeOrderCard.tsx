'use client'

import { Flag, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { cn, getDaysUntilDeadline } from '@/lib/utils'
import { DESIGN_STATUS_LABEL, DESIGN_STATUS_COLOR } from '@/lib/constants'
import type { IClient, IOrder, IUser } from '@/types'

interface CreativeOrderCardProps {
  order: IOrder
  selected: boolean
  onClick: () => void
}

export function CreativeOrderCard({ order, selected, onClick }: CreativeOrderCardProps) {
  const client = order.client as IClient
  const assignee = order.assignedTeam?.creativeExecutive as IUser | string | undefined
  const assigneeName = assignee && typeof assignee !== 'string' ? assignee.name : undefined

  const daysLeft = getDaysUntilDeadline(order.deliveryDate)
  const isDone = order.status === 'delivered' || order.status === 'cancelled'
  const urgent = order.priority === 'urgent' || order.priority === 'high'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white rounded-lg border p-3 transition-colors hover:border-gray-300',
        selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-bold text-gray-900">{order.orderNumber}</span>
        {urgent && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
            <Flag size={11} className="fill-current" /> Urgent
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate">{client?.companyName || '—'}</p>
      <p className="text-xs text-gray-500 truncate">{order.productType} · {order.quantity.toLocaleString()} pcs</p>

      <div className="flex items-center justify-between mt-2.5 gap-2">
        <Badge label={DESIGN_STATUS_LABEL[order.designStatus]} className={DESIGN_STATUS_COLOR[order.designStatus]} />
        <div className="flex items-center gap-2">
          {!isDone && (
            <span className={cn('flex items-center gap-1 text-xs font-medium', daysLeft < 0 ? 'text-red-600' : daysLeft <= 2 ? 'text-amber-600' : 'text-green-600')}>
              {daysLeft < 0 ? <AlertTriangle size={11} /> : <Clock size={11} />}
              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
            </span>
          )}
          {assigneeName && <Avatar name={assigneeName} size="sm" />}
        </div>
      </div>
    </button>
  )
}
