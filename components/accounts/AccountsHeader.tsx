'use client'

import { IndianRupee } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Button } from '@/components/ui/Button'

interface AccountsHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  onRecordPayment: () => void
}

export function AccountsHeader({ search, onSearchChange, onRecordPayment }: AccountsHeaderProps) {
  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
        <p className="text-sm text-gray-500 uppercase tracking-wide">{monthLabel} · Financial Overview</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          className="w-72"
          placeholder="Search invoice, order no..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Button icon={<IndianRupee size={15} />} onClick={onRecordPayment}>Record Payment</Button>
      </div>
    </div>
  )
}
