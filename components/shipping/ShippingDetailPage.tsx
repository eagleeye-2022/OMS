'use client'

import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShippingDetailHeader } from './ShippingDetailHeader'
import { ShippingDeliveryAddressCard } from './ShippingDeliveryAddressCard'
import { ShippingOrderSummaryCard } from './ShippingOrderSummaryCard'
import { ShippingCourierCard } from './ShippingCourierCard'
import { ShippingStatusActionsCard } from './ShippingStatusActionsCard'
import { ShippingTrackingTimelineCard } from './ShippingTrackingTimelineCard'
import { ShippingNotesCard } from './ShippingNotesCard'
import { ShippingAssignedTeamCard } from './ShippingAssignedTeamCard'
import { ShippingPaymentsCard } from './ShippingPaymentsCard'
import type { IActivityLog, IOrder } from '@/types'

interface ShippingDetailPageProps {
  order: IOrder | null
  logs: IActivityLog[]
  loading: boolean
  canEditShipping: boolean
  isAdmin: boolean
  onUpdated: () => void
  onClose?: () => void
}

/**
 * Shared shipping detail content — used inside both the queue's slide-over
 * drawer (via ShippingDetailDrawer) and the standalone /shipping/[id] route,
 * matching the drawer+page duality proven for Clients/Orders/Creative/Production.
 */
export function ShippingDetailPage({ order, logs, loading, canEditShipping, isAdmin, onUpdated, onClose }: ShippingDetailPageProps) {
  if (loading) return <PageLoader />

  if (!order) {
    return <EmptyState title="Order not found" description="This order may have been removed or you don't have access to it." />
  }

  return (
    <div className="space-y-5">
      <ShippingDetailHeader order={order} onClose={onClose} />
      <ShippingDeliveryAddressCard order={order} />
      <ShippingOrderSummaryCard order={order} />
      <ShippingCourierCard order={order} canEdit={canEditShipping} onUpdated={onUpdated} />
      <ShippingStatusActionsCard order={order} canUpdateStatus={canEditShipping} isAdmin={isAdmin} onUpdated={onUpdated} />
      <ShippingTrackingTimelineCard logs={logs} />
      <ShippingNotesCard order={order} onUpdated={onUpdated} />
      <ShippingAssignedTeamCard order={order} />
      <ShippingPaymentsCard order={order} onUpdated={onUpdated} />
    </div>
  )
}
