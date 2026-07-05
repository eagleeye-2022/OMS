'use client'

import { AssetsDocumentsCard } from '@/components/orders/AssetsDocumentsCard'
import type { IOrder } from '@/types'

interface CreativeFilesCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
}

/** Creative-facing presentation of the shared Order assets list — reuses the same data/API, just relabeled. */
export function CreativeFilesCard({ order, canEdit, onUpdated }: CreativeFilesCardProps) {
  return <AssetsDocumentsCard order={order} canEdit={canEdit} onUpdated={onUpdated} title="Design Files" />
}
