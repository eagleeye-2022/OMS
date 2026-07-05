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

export function summaryCounts(orders: IOrder[]): Record<ShippingSummaryKey, number> {
  const counts: Record<ShippingSummaryKey, number> = {
    shipping_ready: 0, dispatched: 0, in_transit: 0, delayed: 0, delivered: 0,
  }
  for (const order of orders) {
    if (order.status in counts) counts[order.status as ShippingSummaryKey]++
  }
  return counts
}
