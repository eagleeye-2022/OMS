import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TimelineItem {
  icon?: ReactNode
  color?: string
  title: string
  sub?: string
  time?: string
}

interface TimelineProps {
  items: TimelineItem[]
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 pb-5 relative">
          <div className="flex flex-col items-center">
            <div className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', item.color || 'bg-gray-400')} />
            {i < items.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">{item.title}</p>
            {item.sub && <p className="text-xs text-gray-500">{item.sub}</p>}
            {item.time && <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
