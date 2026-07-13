'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { cn } from '@/lib/utils'

interface ProductionHeaderProps {
  total: number
  search: string
  onSearchChange: (value: string) => void
  /** True for a 'production' role viewer — the "My Batches / All" toggle is admin-only, since Production users only ever see their own assigned batches (no team-wide or unassigned view). */
  isProductionRole: boolean
  assignedToMe: boolean
  onAssignedToMeChange: (value: boolean) => void
}

export function ProductionHeader({ total, search, onSearchChange, isProductionRole, assignedToMe, onAssignedToMeChange }: ProductionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Production Queue</h1>
        <p className="text-sm text-gray-500">{total} {isProductionRole ? 'batches assigned to you' : 'orders in production'}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {!isProductionRole && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm">
            <button
              onClick={() => onAssignedToMeChange(true)}
              className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', assignedToMe ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
            >
              My Batches
            </button>
            <button
              onClick={() => onAssignedToMeChange(false)}
              className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', !assignedToMe ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
            >
              All
            </button>
          </div>
        )}
        <SearchBar
          className="w-72"
          placeholder="Search orders, clients, or items..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
