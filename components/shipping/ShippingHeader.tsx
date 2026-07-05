'use client'

import { SearchBar } from '@/components/ui/SearchBar'

interface ShippingHeaderProps {
  total: number
  search: string
  onSearchChange: (value: string) => void
}

export function ShippingHeader({ total, search, onSearchChange }: ShippingHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Shipping</h1>
        <p className="text-sm text-gray-500">{total} orders in the shipping pipeline</p>
      </div>
      <SearchBar
        className="w-72"
        placeholder="Search orders, clients, or tracking..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  )
}
