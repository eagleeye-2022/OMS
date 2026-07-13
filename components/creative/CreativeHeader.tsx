'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { cn } from '@/lib/utils'

interface CreativeHeaderProps {
  total: number
  search: string
  onSearchChange: (value: string) => void
  /** True for a 'creative' role viewer — swaps the "My Tasks / All" toggle for "My Queue / Unassigned", since creative users don't get an "All" view. */
  isCreativeRole: boolean
  assignedToMe: boolean
  onAssignedToMeChange: (value: boolean) => void
  showUnassigned: boolean
  onShowUnassignedChange: (value: boolean) => void
}

export function CreativeHeader({
  total,
  search,
  onSearchChange,
  isCreativeRole,
  assignedToMe,
  onAssignedToMeChange,
  showUnassigned,
  onShowUnassignedChange,
}: CreativeHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Creative Queue</h1>
        <p className="text-sm text-gray-500">
          {total} {isCreativeRole ? (showUnassigned ? 'unassigned orders' : 'orders assigned to you') : 'orders assigned to creative'}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm">
          {isCreativeRole ? (
            <>
              <button
                onClick={() => onShowUnassignedChange(false)}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', !showUnassigned ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                My Queue
              </button>
              <button
                onClick={() => onShowUnassignedChange(true)}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', showUnassigned ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                Unassigned
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAssignedToMeChange(true)}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', assignedToMe ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                My Tasks
              </button>
              <button
                onClick={() => onAssignedToMeChange(false)}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', !assignedToMe ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                All
              </button>
            </>
          )}
        </div>
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
