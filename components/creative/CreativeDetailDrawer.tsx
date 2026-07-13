'use client'

import { Drawer } from '@/components/ui/Drawer'
import { CreativeDetailPage } from './CreativeDetailPage'
import type { IOrder } from '@/types'

interface CreativeDetailDrawerProps {
  open: boolean
  order: IOrder | null
  loading: boolean
  isAdmin: boolean
  currentUserId?: string
  isCreativeRole?: boolean
  onClose: () => void
  onUpdated: () => void
}

export function CreativeDetailDrawer({ open, order, loading, isAdmin, currentUserId, isCreativeRole, onClose, onUpdated }: CreativeDetailDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} width="w-[26rem]">
      <CreativeDetailPage
        order={order}
        loading={loading}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        isCreativeRole={isCreativeRole}
        onUpdated={onUpdated}
        onClose={onClose}
      />
    </Drawer>
  )
}
