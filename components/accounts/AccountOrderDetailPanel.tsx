'use client'

import { useState } from 'react'
import { AlertTriangle, Bell, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaymentSummaryCard } from './PaymentSummaryCard'
import { RecordPaymentForm } from './RecordPaymentForm'
import { PaymentHistoryTimeline } from './PaymentHistoryTimeline'
import { AccountInvoiceFileCard } from './AccountInvoiceFileCard'
import { AccountNotesCard } from './AccountNotesCard'
import { PaymentReceiptModal } from './PaymentReceiptModal'
import { isOrderOverdue } from './types'
import { CLIENT_STATUS_LABEL, CLIENT_STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { IActivityLog, IClient, IOrder, IPayment } from '@/types'

interface AccountOrderDetailPanelProps {
  order: IOrder | null
  logs: IActivityLog[]
  loading: boolean
  onUpdated: () => void
  onClose?: () => void
  onUpload: (order: IOrder) => void
  onPreview: (order: IOrder) => void
  onRemind: (order: IOrder) => void
}

export function AccountOrderDetailPanel({ order, logs, loading, onUpdated, onClose, onUpload, onPreview, onRemind }: AccountOrderDetailPanelProps) {
  const [receipt, setReceipt] = useState<IPayment | null>(null)

  if (loading) return <PageLoader />
  if (!order) return <EmptyState title="Order not found" description="This order may have been removed or you don't have access to it." />

  const client = order.client as IClient
  const overdue = isOrderOverdue(order)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{order.orderNumber}</h2>
            {overdue && <Badge label="Overdue" className="bg-red-100 text-red-700" />}
          </div>
          {order.invoice?.invoiceNumber && <p className="text-sm text-gray-500">{order.invoice.invoiceNumber}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
        )}
      </div>

      {client && typeof client !== 'string' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={client.companyName} size="md" />
            <div>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                {client.companyName}
                <Badge label={CLIENT_STATUS_LABEL[client.status]} className={CLIENT_STATUS_COLOR[client.status]} />
              </p>
              {client.contactPersonName && <p className="text-xs text-gray-500">{client.contactPersonName}{client.phone ? ` | +91 ${client.phone}` : ''}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-gray-400">Created On</p><p className="font-medium text-gray-800">{formatDate(order.createdAt)}</p></div>
            <div><p className="text-gray-400">Delivery Date</p><p className="font-medium text-gray-800">{formatDate(order.deliveryDate)}</p></div>
            <div><p className="text-gray-400">Priority</p><Badge label={PRIORITY_LABEL[order.priority]} className={PRIORITY_COLOR[order.priority]} /></div>
          </div>
        </div>
      )}

      {overdue && (
        <button
          onClick={() => onRemind(order)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
        >
          <Bell size={14} /> Send Overdue Payment Reminder
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Specifications</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Category</span><span className="font-medium text-gray-900">{order.category}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Print Type</span><span className="font-medium text-gray-900">{order.productType}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="font-medium text-gray-900">{order.quantity.toLocaleString()} units</span></div>
            {order.sizeBreakdown && <div className="flex justify-between"><span className="text-gray-400">Sizes</span><span className="font-medium text-gray-900 text-right">{order.sizeBreakdown}</span></div>}
          </div>
        </div>
        <RecordPaymentForm order={order} onRecorded={(p) => { setReceipt(p); onUpdated() }} />
      </div>

      <PaymentSummaryCard order={order} />
      <AccountInvoiceFileCard order={order} onUpload={() => onUpload(order)} onPreview={() => onPreview(order)} />
      <AccountNotesCard order={order} onUpdated={onUpdated} />
      <PaymentHistoryTimeline logs={logs} />

      {order.status === 'delivered' && !overdue && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <AlertTriangle size={12} /> No further payment actions needed — order delivered.
        </div>
      )}

      <PaymentReceiptModal payment={receipt} onClose={() => setReceipt(null)} onRecordAnother={() => setReceipt(null)} />
    </div>
  )
}
