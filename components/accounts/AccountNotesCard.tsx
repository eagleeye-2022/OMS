'use client'

import { InternalNotesCard } from '@/components/orders/InternalNotesCard'
import type { IOrder } from '@/types'

interface AccountNotesCardProps {
  order: IOrder
  onUpdated: () => void
}

/** Accounts-facing presentation of the shared Order notes thread — reuses the same data/API, scoped to the 'accounts' note domain. */
export function AccountNotesCard({ order, onUpdated }: AccountNotesCardProps) {
  return <InternalNotesCard order={order} onUpdated={onUpdated} title="Accounts Notes" noteType="accounts" />
}
