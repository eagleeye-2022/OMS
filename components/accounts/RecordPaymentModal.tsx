'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { RecordPaymentForm } from './RecordPaymentForm'
import { PaymentReceiptModal } from './PaymentReceiptModal'
import { formatCurrency } from '@/lib/utils'
import type { IClient, IOrder, IPayment } from '@/types'

interface RecordPaymentModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function RecordPaymentModal({ open, onClose, onSaved }: RecordPaymentModalProps) {
  const [orders, setOrders] = useState<IOrder[]>([])
  const [orderId, setOrderId] = useState('')
  const [receipt, setReceipt] = useState<IPayment | null>(null)

  useEffect(() => {
    if (!open) return
    // excludeCancelled: a cancelled order is a dead deal — it must not be
    // selectable here, or a real Payment record could get created against it.
    fetch('/api/orders?limit=200&excludeCancelled=true').then((r) => r.json()).then((d) => {
      if (d.success) setOrders(d.data.filter((o: IOrder) => (o.balanceDue ?? 0) > 0))
    })
  }, [open])

  const selected = orders.find((o) => o._id === orderId) || null

  const close = () => { setOrderId(''); onClose() }

  return (
    <>
      <Modal open={open && !receipt} onClose={close} title="Record Payment" size="md">
        <div className="space-y-4">
          <Select
            label="Order *"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            options={[
              { value: '', label: 'Search / select order with balance due' },
              ...orders.map((o) => ({
                value: o._id,
                label: `${o.orderNumber} — ${(o.client as IClient)?.companyName} (Due: ${formatCurrency(o.balanceDue ?? 0)})`,
              })),
            ]}
          />
          {selected && (
            <RecordPaymentForm
              key={selected._id}
              order={selected}
              onRecorded={(p) => { setReceipt(p); onSaved() }}
            />
          )}
        </div>
      </Modal>

      <PaymentReceiptModal
        payment={receipt}
        onClose={() => { setReceipt(null); close() }}
        onRecordAnother={() => setReceipt(null)}
      />
    </>
  )
}
