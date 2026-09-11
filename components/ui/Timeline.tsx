import { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimelineItem {
  icon?: ReactNode
  color?: string
  title: string
  sub?: string
  time?: string
  author?: string
  badge?: ReactNode
  attachment?: { name: string; size?: string; url?: string }
}

interface TimelineProps {
  items: TimelineItem[]
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 pb-6 relative">
          {item.time && (
            <div className="w-16 shrink-0 text-right text-xs font-medium text-gray-400 pt-1">
              {item.time}
            </div>
          )}

          <div className="flex flex-col items-center relative">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 z-10 shadow-xs',
                item.color || 'bg-blue-600'
              )}
            >
              {item.icon || <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            {i < items.length - 1 && (
              <div className="w-[2px] absolute top-7 bottom-0 bg-gray-200" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                {item.badge}
              </div>
              {item.author && (
                <span className="text-xs text-gray-400 font-normal shrink-0">
                  {item.author}
                </span>
              )}
            </div>

            {item.sub && (
              <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                {item.sub}
              </p>
            )}

            {item.attachment && (
              <a
                href={item.attachment.url || '#'}
                target={item.attachment.url ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 pr-4 text-xs hover:border-blue-300 transition-colors"
              >
                <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">{item.attachment.name}</p>
                  {item.attachment.size && <p className="text-[11px] text-gray-400">{item.attachment.size}</p>}
                </div>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
