'use client'

import { OrderTimelineCard } from '@/components/orders/OrderTimelineCard'
import type { IActivityLog } from '@/types'

interface ShippingTrackingTimelineCardProps {
  logs: IActivityLog[]
}

/** Reuses the shared ActivityLog-backed timeline, relabeled for the shipping context. */
export function ShippingTrackingTimelineCard({ logs }: ShippingTrackingTimelineCardProps) {
  return <OrderTimelineCard logs={logs} title="Tracking Timeline" />
}
