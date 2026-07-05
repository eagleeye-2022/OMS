'use client'

import { Drawer } from '@/components/ui/Drawer'
import { AccountOrderDetailPanel } from './AccountOrderDetailPanel'
import type { IActivityLog, IOrder } from '@/types'

interface AccountsDetailDrawerProps {
  open: boolean
  order: IOrder | null
  logs: IActivityLog[]
  loading: boolean
  onClose: () => void
  onUpdated: () => void
  onUpload: (order: IOrder) => void
  onPreview: (order: IOrder) => void
  onRemind: (order: IOrder) => void
}

export function AccountsDetailDrawer({ open, order, logs, loading, onClose, onUpdated, onUpload, onPreview, onRemind }: AccountsDetailDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} width="w-[28rem]">
      <AccountOrderDetailPanel
        order={order}
        logs={logs}
        loading={loading}
        onUpdated={onUpdated}
        onClose={onClose}
        onUpload={onUpload}
        onPreview={onPreview}
        onRemind={onRemind}
      />
    </Drawer>
  )
}
