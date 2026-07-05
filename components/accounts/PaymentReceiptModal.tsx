'use client'

import { CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { IClient, IOrder, IPayment } from '@/types'

interface PaymentReceiptModalProps {
  payment: IPayment | null
  onClose: () => void
  onRecordAnother: () => void
}

export function PaymentReceiptModal({ payment, onClose, onRecordAnother }: PaymentReceiptModalProps) {
  if (!payment) return null

  const order = payment.order as IOrder
  const client = payment.client as IClient
  const clientName = client && typeof client !== 'string' ? client.companyName : ''
  const orderNumber = order && typeof order !== 'string' ? order.orderNumber : ''

  const downloadReceipt = () => {
    const text = [
      `Payment Receipt — ${payment.receiptNumber}`,
      `Amount: ${formatCurrency(payment.amount)}`,
      `Mode: ${payment.method}`,
      `Date: ${formatDate(payment.paymentDate)}`,
      `Order: ${orderNumber}`,
      `Client: ${clientName}`,
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${payment.receiptNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal open={Boolean(payment)} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Payment Recorded!</h2>
        <p className="text-sm text-gray-500 mt-1">{formatCurrency(payment.amount)} received from {clientName} against {orderNumber}</p>

        <div className="w-full mt-5 border border-gray-200 rounded-lg p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Payment Receipt</p>
          {[
            ['Receipt', payment.receiptNumber],
            ['Amount', formatCurrency(payment.amount)],
            ['Mode', payment.method],
            ['Date', formatDate(payment.paymentDate)],
            ['Order', orderNumber],
            ['Client', clientName],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        <div className="w-full mt-5 space-y-2">
          <Button className="w-full justify-center" onClick={onRecordAnother}>Record Another Payment</Button>
          <Button variant="outline" className="w-full justify-center" onClick={downloadReceipt}>Download Receipt</Button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 mt-1">Close</button>
        </div>
      </div>
    </Modal>
  )
}
