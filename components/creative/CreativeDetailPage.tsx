'use client'

import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreativeDetailHeader } from './CreativeDetailHeader'
import { CreativeAssigneeCard } from './CreativeAssigneeCard'
import { CreativeFilesCard } from './CreativeFilesCard'
import { CreativeRemarksCard } from './CreativeRemarksCard'
import { OrderSummarySentence } from '@/components/orders/OrderSummarySentence'
import { OrderClientInfoCard } from '@/components/orders/OrderClientInfoCard'
import { OrderSpecsCard } from '@/components/orders/OrderSpecsCard'
import { OrderTimelineCard } from '@/components/orders/OrderTimelineCard'
import type { IActivityLog, IOrder, IUser } from '@/types'

interface CreativeDetailPageProps {
  order: IOrder | null
  logs: IActivityLog[]
  loading: boolean
  isAdmin: boolean
  currentUserId?: string
  isCreativeRole?: boolean
  onUpdated: () => void
  onClose?: () => void
}

/**
 * The full creative detail content — shared between the board's slide-over
 * drawer (via CreativeDetailDrawer) and the standalone /creative-queue/[id]
 * route, matching the two-view pattern used by the Client and Order modules.
 */
export function CreativeDetailPage({ order, logs, loading, isAdmin, currentUserId, isCreativeRole, onUpdated, onClose }: CreativeDetailPageProps) {
  if (loading) return <PageLoader />

  if (!order) {
    return <EmptyState title="Order not found" description="This order may have been removed or you don't have access to it." />
  }

  // A non-admin creative user may only edit design status / files on an order
  // claimed by *them* — this page is reachable by direct id/URL, not just
  // through the (already-filtered) queue list, so it mirrors the ownership
  // check the API now enforces (isOrderAssignedToSelf) rather than trusting
  // role alone. An unclaimed order stays read-only here too; "Claim this
  // task" (CreativeAssigneeCard) is the only way in.
  const assignee = order.assignedTeam?.creativeExecutive as IUser | string | undefined
  const assigneeId = assignee ? (typeof assignee === 'string' ? assignee : assignee._id) : ''
  const isOwnOrder = isAdmin || (Boolean(isCreativeRole) && assigneeId === currentUserId)

  return (
    <div className="space-y-5">
      <CreativeDetailHeader order={order} canEdit={isOwnOrder} onUpdated={onUpdated} onClose={onClose} />
      <OrderSummarySentence order={order} />
      <OrderClientInfoCard order={order} />
      <CreativeAssigneeCard order={order} canEdit={isAdmin} currentUserId={currentUserId} isCreativeRole={isCreativeRole} onUpdated={onUpdated} />
      <OrderSpecsCard order={order} />
      <CreativeFilesCard order={order} canEdit={isOwnOrder} onUpdated={onUpdated} />
      <CreativeRemarksCard order={order} onUpdated={onUpdated} />
      <OrderTimelineCard logs={logs} title="Design Timeline" />
    </div>
  )
}
