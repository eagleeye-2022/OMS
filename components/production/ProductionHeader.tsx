'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { cn } from '@/lib/utils'

export type ProductionTab = 'mine' | 'unassigned' | 'all'

interface ProductionHeaderProps {
  total: number
  search: string
  onSearchChange: (value: string) => void
  isProductionRole: boolean
  assignedToMe: boolean
  onAssignedToMeChange: (value: boolean) => void
  productionTab: ProductionTab
  onProductionTabChange: (tab: ProductionTab) => void
}

export function ProductionHeader({
  total,
  search,
  onSearchChange,
  isProductionRole,
  assignedToMe,
  onAssignedToMeChange,
  productionTab,
  onProductionTabChange,
}: ProductionHeaderProps) {
  const getSubTitle = () => {
    if (!isProductionRole) return 'orders in production'
    if (productionTab === 'unassigned') return 'unassigned production orders'
    return 'total production orders'
  }

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Production Queue</h1>
        <p className="text-sm text-gray-500">
          {total} {getSubTitle()}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm">
          {isProductionRole ? (
            <>
              <button
                onClick={() => onProductionTabChange('mine')}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', productionTab === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                My Queue
              </button>
              <button
                onClick={() => onProductionTabChange('unassigned')}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', productionTab === 'unassigned' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                Unassigned
              </button>
              <button
                onClick={() => onProductionTabChange('all')}
                className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', productionTab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                All
              </button>
            </>
          ) : (
            <>
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
