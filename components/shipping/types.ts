import type { IOrder } from '@/types'

export type ShippingSummaryKey = 'shipping_ready' | 'dispatched' | 'in_transit' | 'delayed' | 'delivered'

export const SHIPPING_SUMMARY_KEYS: ShippingSummaryKey[] = ['shipping_ready', 'dispatched', 'in_transit', 'delayed', 'delivered']

export const SHIPPING_SUMMARY_LABEL: Record<ShippingSummaryKey, string> = {
  shipping_ready: 'Ready to Ship',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delayed: 'Delayed',
  delivered: 'Delivered',
}

// Deliberately a raw status tally, not "actually dispatchable right now" —
// a dispatch-blocked order (overdue + unpaid) keeps its literal
// 'shipping_ready' status until it's genuinely resolved, so it still counts
// here. The queue table row and detail view carry the "Blocked" indicator;
// splitting this KPI into a 6th "Blocked" bucket wasn't asked for and would
// make the dashboard total stop matching the visible queue for no clear
// benefit — see ShippingQueueTable's per-row indicator instead.
export function summaryCounts(orders: IOrder[]): Record<ShippingSummaryKey, number> {
  const counts: Record<ShippingSummaryKey, number> = {
    shipping_ready: 0, dispatched: 0, in_transit: 0, delayed: 0, delivered: 0,
  }
  for (const order of orders) {
    if (order.status in counts) counts[order.status as ShippingSummaryKey]++
  }
  return counts
}
