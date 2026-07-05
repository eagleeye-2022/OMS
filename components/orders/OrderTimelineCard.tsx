'use client'

import { Timeline } from '@/components/ui/Timeline'
import { formatRelativeTime } from '@/lib/utils'
import type { IActivityLog } from '@/types'

const ACTIVITY_COLOR: Record<string, string> = {
  order_created: 'bg-blue-500',
  design_approved: 'bg-green-500',
  production_stage_updated: 'bg-amber-500',
  production_completed: 'bg-green-500',
  status_changed: 'bg-purple-500',
  note_added: 'bg-gray-400',
  asset_added: 'bg-teal-500',
  team_assigned: 'bg-indigo-500',
  order_updated: 'bg-gray-400',
  order_dispatched: 'bg-cyan-500',
  order_delivered: 'bg-green-500',
  payment_recorded: 'bg-green-500',
  invoice_uploaded: 'bg-indigo-500',
  payment_reminder_sent: 'bg-red-500',
}

interface OrderTimelineCardProps {
  logs: IActivityLog[]
  title?: string
}

export function OrderTimelineCard({ logs, title = 'Order Status Timeline' }: OrderTimelineCardProps) {
  const items = logs.map((log) => ({
    title: log.description,
    sub: log.userName,
    time: formatRelativeTime(log.createdAt),
    color: ACTIVITY_COLOR[log.type] || 'bg-gray-400',
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      {items.length > 0 ? <Timeline items={items} /> : <p className="text-sm text-gray-400">No activity yet.</p>}
    </div>
  )
}
