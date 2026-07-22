
'use client'

import { X, AlertCircle, DollarSign, CheckCircle, UserPlus, Truck, Flag } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useNotificationsContext } from '@/components/providers/NotificationsProvider'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { INotification } from '@/types'

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-purple-500',
  low: 'bg-green-500',
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    order_overdue: <AlertCircle size={14} className="text-red-500" />,
    payment_pending: <DollarSign size={14} className="text-amber-500" />,
    design_approved: <CheckCircle size={14} className="text-green-500" />,
    new_client: <UserPlus size={14} className="text-blue-500" />,
    dispatch_update: <Truck size={14} className="text-sky-500" />,
    order_flagged: <Flag size={14} className="text-orange-500" />,
    general: <AlertCircle size={14} className="text-gray-500" />,
  }
  return <>{icons[type] ?? <AlertCircle size={14} className="text-gray-400" />}</>
}

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationsContext()

  return (
    <Drawer open={open} onClose={onClose} title="" width="w-96">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
          <p className="text-xs text-gray-500">{unreadCount} unread messages</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-0 divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
        ) : (
          notifications.map((n: INotification) => (
            <NotificationItem key={n._id} notification={n} onRead={markRead} />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        </div>
      )}
    </Drawer>
  )
}

function NotificationItem({ notification: n, onRead }: { notification: INotification; onRead: (id: string) => void }) {
  return (
    <div
      className={cn('py-4 px-1 cursor-pointer hover:bg-gray-50 transition-colors', n.isRead ? 'opacity-70' : '')}
      onClick={() => !n.isRead && onRead(n._id)}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className={cn('w-2 h-2 rounded-full mt-1', n.isRead ? 'bg-transparent' : PRIORITY_DOT[n.priority] || 'bg-gray-400')} />
          <TypeIcon type={n.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm', n.isRead ? 'text-gray-600' : 'font-semibold text-gray-900')}>{n.title}</p>
            {n.priority === 'critical' && !n.isRead && (
              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded shrink-0">CRITICAL</span>
            )}
          </div>
          {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}
