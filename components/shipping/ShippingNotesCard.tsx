'use client'

import { InternalNotesCard } from '@/components/orders/InternalNotesCard'
import type { IOrder } from '@/types'

interface ShippingNotesCardProps {
  order: IOrder
  onUpdated: () => void
}

/** Shipping-facing presentation of the shared Order notes thread — reuses the same data/API, scoped to the 'shipping' note domain. */
export function ShippingNotesCard({ order, onUpdated }: ShippingNotesCardProps) {
  return <InternalNotesCard order={order} onUpdated={onUpdated} title="Shipping Notes" noteType="shipping" />
}
