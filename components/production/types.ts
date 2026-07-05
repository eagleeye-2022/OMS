import { PRODUCTION_STAGE_KEYS, type ProductionStageKey } from '@/lib/constants'
import type { IOrder } from '@/types'

export { PRODUCTION_STAGE_KEYS }
export type { ProductionStageKey }

export function stageCounts(orders: IOrder[]): Record<ProductionStageKey, number> {
  const counts: Record<ProductionStageKey, number> = { printing: 0, stitching: 0, finishing: 0, qcCheck: 0 }
  for (const order of orders) {
    for (const key of PRODUCTION_STAGE_KEYS) {
      if (order.productionStages[key].status !== 'pending') counts[key]++
    }
  }
  return counts
}

export function isChecklistComplete(order: IOrder): boolean {
  return PRODUCTION_STAGE_KEYS.every((key) => order.productionStages[key].status === 'completed')
}
