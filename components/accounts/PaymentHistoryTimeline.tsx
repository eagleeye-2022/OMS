'use client'

import { OrderTimelineCard } from '@/components/orders/OrderTimelineCard'
import type { IActivityLog } from '@/types'

interface PaymentHistoryTimelineProps {
  logs: IActivityLog[]
}

/**
 * Reuses the shared ActivityLog-backed timeline. Payment/invoice events
 * (payment_recorded, invoice_uploaded, payment_reminder_sent) already flow
 * into the same order-scoped ActivityLog as every other module's history —
 * this is the same combined "activity log" shown in the design, not a
 * separate payments-only feed.
 */
export function PaymentHistoryTimeline({ logs }: PaymentHistoryTimelineProps) {
  return <OrderTimelineCard logs={logs} title="Payment & Activity History" />
}
