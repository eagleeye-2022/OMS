'use client'

import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreativeDetailHeader } from './CreativeDetailHeader'
import { CreativeAssigneeCard } from './CreativeAssigneeCard'
import { CreativeOrderSummaryCard } from './CreativeOrderSummaryCard'
import { CreativeFilesCard } from './CreativeFilesCard'
import { CreativeRemarksCard } from './CreativeRemarksCard'
import { CreativeRevisionLogCard } from './CreativeRevisionLogCard'
import type { IOrder } from '@/types'

interface CreativeDetailPageProps {
  order: IOrder | null
  loading: boolean
  isAdmin: boolean
  onUpdated: () => void
  onClose?: () => void
}

/**
 * The full creative detail content — shared between the board's slide-over
 * drawer (via CreativeDetailDrawer) and the standalone /creative-queue/[id]
 * route, matching the two-view pattern used by the Client and Order modules.
 */
export function CreativeDetailPage({ order, loading, isAdmin, onUpdated, onClose }: CreativeDetailPageProps) {
  if (loading) return <PageLoader />

  if (!order) {
    return <EmptyState title="Order not found" description="This order may have been removed or you don't have access to it." />
  }

  return (
    <div className="space-y-5">
      <CreativeDetailHeader order={order} onUpdated={onUpdated} onClose={onClose} />
      <CreativeAssigneeCard order={order} canEdit={isAdmin} onUpdated={onUpdated} />
      <CreativeOrderSummaryCard order={order} />
      <CreativeFilesCard order={order} canEdit onUpdated={onUpdated} />
      <CreativeRemarksCard order={order} onUpdated={onUpdated} />
      <CreativeRevisionLogCard revisionHistory={order.revisionHistory} />
    </div>
  )
}
