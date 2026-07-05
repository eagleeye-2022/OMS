import { CREATIVE_BOARD_COLUMNS, DESIGN_STATUS_TO_BOARD_COLUMN, type CreativeBoardColumn } from '@/lib/constants'
import type { IOrder, DesignStatus } from '@/types'

export function boardColumnOf(designStatus: DesignStatus): CreativeBoardColumn {
  return DESIGN_STATUS_TO_BOARD_COLUMN[designStatus]
}

/** Groups a flat order list into the 4 kanban columns, preserving input order within each column. */
export function groupOrdersByColumn(orders: IOrder[]): Record<CreativeBoardColumn, IOrder[]> {
  const groups: Record<CreativeBoardColumn, IOrder[]> = {
    design_pending: [],
    in_progress: [],
    awaiting_approval: [],
    approved: [],
  }
  for (const order of orders) {
    groups[boardColumnOf(order.designStatus)].push(order)
  }
  return groups
}

export { CREATIVE_BOARD_COLUMNS }
export type { CreativeBoardColumn }
