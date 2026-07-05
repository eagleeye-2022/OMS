'use client'

import { Drawer } from '@/components/ui/Drawer'
import { ShippingDetailPage } from './ShippingDetailPage'
import type { IActivityLog, IOrder } from '@/types'

interface ShippingDetailDrawerProps {
  open: boolean
  order: IOrder | null
  logs: IActivityLog[]
  loading: boolean
  canEditShipping: boolean
  isAdmin: boolean
  onClose: () => void
  onUpdated: () => void
}

export function ShippingDetailDrawer({ open, order, logs, loading, canEditShipping, isAdmin, onClose, onUpdated }: ShippingDetailDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} width="w-[26rem]">
      <ShippingDetailPage
        order={order}
        logs={logs}
        loading={loading}
        canEditShipping={canEditShipping}
        isAdmin={isAdmin}
        onUpdated={onUpdated}
        onClose={onClose}
      />
    </Drawer>
  )
}
