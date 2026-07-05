'use client'

import { Drawer } from '@/components/ui/Drawer'
import { ProductionDetailPage } from './ProductionDetailPage'
import type { IOrder } from '@/types'

interface ProductionDetailDrawerProps {
  open: boolean
  order: IOrder | null
  loading: boolean
  isAdmin: boolean
  canEditStages: boolean
  onClose: () => void
  onUpdated: () => void
}

export function ProductionDetailDrawer({ open, order, loading, isAdmin, canEditStages, onClose, onUpdated }: ProductionDetailDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} width="w-[26rem]">
      <ProductionDetailPage order={order} loading={loading} isAdmin={isAdmin} canEditStages={canEditStages} onUpdated={onUpdated} onClose={onClose} />
    </Drawer>
  )
}
