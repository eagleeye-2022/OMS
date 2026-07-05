'use client'

import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProductionDetailHeader } from './ProductionDetailHeader'
import { ProductionAssigneeCard } from './ProductionAssigneeCard'
import { ProductionOrderSummaryCard } from './ProductionOrderSummaryCard'
import { ProductionStageProgressCard } from './ProductionStageProgressCard'
import { ProductionChecklistCard } from './ProductionChecklistCard'
import { ProductionRemarksCard } from './ProductionRemarksCard'
import { ProductionHistoryCard } from './ProductionHistoryCard'
import type { IOrder } from '@/types'

interface ProductionDetailPageProps {
  order: IOrder | null
  loading: boolean
  isAdmin: boolean
  canEditStages: boolean
  onUpdated: () => void
  onClose?: () => void
}

/**
 * Shared production detail content — used inside both the board's slide-over
 * drawer (via ProductionDetailDrawer) and the standalone /production/[id]
 * route, matching the drawer+page duality proven for Clients/Orders/Creative.
 */
export function ProductionDetailPage({ order, loading, isAdmin, canEditStages, onUpdated, onClose }: ProductionDetailPageProps) {
  if (loading) return <PageLoader />

  if (!order) {
    return <EmptyState title="Order not found" description="This order may have been removed or you don't have access to it." />
  }

  return (
    <div className="space-y-5">
      <ProductionDetailHeader order={order} onClose={onClose} />
      <ProductionAssigneeCard order={order} canEdit={isAdmin} onUpdated={onUpdated} />
      <ProductionOrderSummaryCard order={order} />
      <ProductionStageProgressCard order={order} canEdit={canEditStages} onUpdated={onUpdated} />
      <ProductionChecklistCard order={order} canComplete={canEditStages} onCompleted={onUpdated} />

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
