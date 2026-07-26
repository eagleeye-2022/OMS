export interface ProductionStageProgressLike {
  status: string
  unitsCompleted: number
  totalUnits: number
}

/**
 * A production stage is only genuinely done once its unit count actually
 * reflects that — `status` can be set to 'completed' by hand (e.g. via the
 * dropdown in ProductionStageProgressCard) while `unitsCompleted` is still 0,
 * which used to be enough to unlock "Mark Production Complete" even though
 * nothing was actually finished. `totalUnits` falls back to the order's own
 * quantity, matching ProductionStageProgressCard's display logic.
 *
 * Has no server-only imports (unlike lib/order-status.ts, which pulls in
 * Mongoose models) so it's safe to import from both client components
 * (components/production/types.ts re-exports it) and API routes
 * (app/api/orders/[id]/route.ts, .../production-complete/route.ts) without
 * dragging Mongoose into the client bundle.
 */
export function isStageDone(stage: ProductionStageProgressLike, orderQuantity: number): boolean {
  const total = stage.totalUnits || orderQuantity
  return stage.status === 'completed' && stage.unitsCompleted >= total
}
