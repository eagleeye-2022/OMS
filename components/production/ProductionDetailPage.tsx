'use client'

import { AlertTriangle } from 'lucide-react'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { getProductionBlockReason } from '@/lib/constants'
import { ProductionDetailHeader } from './ProductionDetailHeader'
import { ProductionAssigneeCard } from './ProductionAssigneeCard'
import { ProductionOrderSummaryCard } from './ProductionOrderSummaryCard'
import { ProductionStageProgressCard } from './ProductionStageProgressCard'
import { ProductionChecklistCard } from './ProductionChecklistCard'
import { ProductionRemarksCard } from './ProductionRemarksCard'
import { ProductionHistoryCard } from './ProductionHistoryCard'
import type { IOrder, IUser, OrderStatus } from '@/types'

interface ProductionDetailPageProps {
  order: IOrder | null
  loading: boolean
  isAdmin: boolean
  canEditStages: boolean
  currentUserId?: string
  onUpdated: () => void
  onClose?: () => void
}

/**
 * Shared production detail content — used inside both the board's slide-over
 * drawer (via ProductionDetailDrawer) and the standalone /production/[id]
 * route, matching the drawer+page duality proven for Clients/Orders/Creative.
 */
export function ProductionDetailPage({ order, loading, isAdmin, canEditStages, currentUserId, onUpdated, onClose }: ProductionDetailPageProps) {
  if (loading) return <PageLoader />

  if (!order) {
    return <EmptyState title="Order not found" description="This order may have been removed or you don't have access to it." />
  }

  // The Production queue already excludes orders whose design isn't approved
  // yet (relevantTo=production), but this detail view is also reachable
  // directly by id (drawer deep-link, /production/[id] route) — so it needs
  // its own guard. Admin keeps its usual override; this mirrors the
  // server-side write guard in app/api/orders/[id]/route.ts and
  // production-complete/route.ts exactly (same getProductionBlockReason),
  // so the UI never offers an action the API would reject anyway.
  const blockReason = getProductionBlockReason(order.status as OrderStatus)
  const productionBlocked = !isAdmin && blockReason !== null

  // A non-admin production user may only edit stage progress on an order
  // assigned to *them* — "All" view intentionally lets them see a teammate's
  // assigned order (read-only, for coordination), and this detail page is
  // also reachable by direct id/URL, so this mirrors the ownership check the
  // API now enforces (isOrderAssignedToSelf) rather than trusting the
  // role-only `canEditStages` flag alone.
  const assignee = order.assignedTeam?.productionManager as IUser | string | undefined
  const assigneeId = assignee ? (typeof assignee === 'string' ? assignee : assignee._id) : ''
  const isOwnOrder = isAdmin || assigneeId === currentUserId
  const effectiveCanEditStages = canEditStages && isOwnOrder

  return (
    <div className="space-y-5">
      <ProductionDetailHeader order={order} onClose={onClose} />

      {blockReason && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {blockReason}
            {isAdmin && ' You can still edit as admin.'}
          </span>
        </div>
      )}

      <ProductionAssigneeCard order={order} canEdit={isAdmin} onUpdated={onUpdated} />
      <ProductionOrderSummaryCard order={order} />
      <ProductionStageProgressCard order={order} canEdit={effectiveCanEditStages && !productionBlocked} onUpdated={onUpdated} />
      <ProductionChecklistCard order={order} canComplete={effectiveCanEditStages && !productionBlocked} onCompleted={onUpdated} />

      {order.creativeRemarks && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Creative Remarks</h3>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
            {order.creativeRemarks}
          </div>
        </div>
      )}

      <ProductionRemarksCard order={order} onUpdated={onUpdated} />
      <ProductionHistoryCard revisionHistory={order.revisionHistory} />
    </div>
  )
}
