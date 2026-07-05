import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  badge?: ReactNode
  className?: string
}

export function StatCard({ label, value, sub, accent, badge, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1', className)}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold', accent || 'text-gray-900')}>{value}</span>
        {badge}
      </div>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
