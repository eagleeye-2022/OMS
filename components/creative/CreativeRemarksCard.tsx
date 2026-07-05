'use client'

import { InternalNotesCard } from '@/components/orders/InternalNotesCard'
import type { IOrder } from '@/types'

interface CreativeRemarksCardProps {
  order: IOrder
  onUpdated: () => void
}

/** Creative-facing presentation of the shared Order notes thread — reuses the same data/API, scoped to the 'creative' note domain. */
export function CreativeRemarksCard({ order, onUpdated }: CreativeRemarksCardProps) {
  return <InternalNotesCard order={order} onUpdated={onUpdated} title="Creative Remarks" noteType="creative" />
}
