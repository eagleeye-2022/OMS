'use client'

import { InternalNotesCard } from '@/components/orders/InternalNotesCard'
import type { IOrder } from '@/types'

interface ProductionRemarksCardProps {
  order: IOrder
  onUpdated: () => void
}

/** Production-facing presentation of the shared Order notes thread — reuses the same data/API, scoped to the 'production' note domain. */
export function ProductionRemarksCard({ order, onUpdated }: ProductionRemarksCardProps) {
  return <InternalNotesCard order={order} onUpdated={onUpdated} title="Production Remarks" noteType="production" />
}
