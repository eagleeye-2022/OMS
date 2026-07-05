'use client'

import { StatCard } from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'

interface AccountsSummary {
  totalBilled: number
  totalCollected: number
  balanceOutstanding: number
  overdueAmount: number
  overdueCount: number
  advanceCollected: number
  invoicesPending: number
}

interface AccountsSummaryCardsProps {
  summary: AccountsSummary | null
}

export function AccountsSummaryCards({ summary }: AccountsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard label="Total Billed" value={formatCurrency(summary?.totalBilled ?? 0)} />
      <StatCard label="Total Collected" value={formatCurrency(summary?.totalCollected ?? 0)} accent="text-green-600" />
      <StatCard label="Balance Due" value={formatCurrency(summary?.balanceOutstanding ?? 0)} accent="text-amber-600" />
      <StatCard label="Overdue" value={formatCurrency(summary?.overdueAmount ?? 0)} sub={summary ? `${summary.overdueCount} order(s)` : undefined} accent="text-red-600" />
      <StatCard label="Advances" value={formatCurrency(summary?.advanceCollected ?? 0)} accent="text-blue-600" />
      <StatCard label="Pending Invoices" value={summary?.invoicesPending ?? 0} accent="text-purple-600" />
    </div>
  )
}
