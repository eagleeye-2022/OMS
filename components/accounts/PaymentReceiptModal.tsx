'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { drawReceipt, canvasToPngBlob } from '@/lib/receipt-canvas'
import type { IClient, IOrder, IPayment } from '@/types'

interface PaymentReceiptModalProps {
  payment: IPayment | null
  onClose: () => void
  onRecordAnother: () => void
}

export function PaymentReceiptModal({ payment, onClose, onRecordAnother }: PaymentReceiptModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const order = payment?.order as IOrder | string | undefined
  const client = payment?.client as IClient | string | undefined
  const clientName = client && typeof client !== 'string' ? client.companyName : ''
  const orderNumber = order && typeof order !== 'string' ? order.orderNumber : ''
  // The order this payment was just applied to is only "not fully paid" if we
  // can actually see its post-payment balance — populated by POST
  // /api/payments (see that route's response). An unpopulated/missing order
  // is treated as "can't confirm it's safe," so the CTA stays hidden rather
  // than defaulting to shown.
  const orderBalanceDue = order && typeof order !== 'string' ? order.balanceDue : undefined
  const canRecordAnother = orderBalanceDue != null && orderBalanceDue > 0

  useEffect(() => {
    if (!payment || !canvasRef.current) return
    drawReceipt(canvasRef.current, {
      receiptNumber: payment.receiptNumber,
      amount: formatCurrency(payment.amount),
      method: payment.method,
      date: formatDate(payment.paymentDate),
      orderNumber,
      clientName,
    })
  }, [payment, orderNumber, clientName])

  if (!payment) return null

  const downloadReceipt = async () => {
    if (!canvasRef.current) return
    const blob = await canvasToPngBlob(canvasRef.current)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${payment.receiptNumber}.png`
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
        <p className="text-sm text-gray-500 mt-1">
          {formatCurrency(payment.amount)} received{clientName ? ` from ${clientName}` : ''}{orderNumber ? ` against ${orderNumber}` : ''}
        </p>

        {/* Rendered as a raster image, not editable DOM text/fields — this
            <canvas> IS the receipt; the download below is the exact same
            pixels, not a separate re-render. */}
        <canvas ref={canvasRef} className="w-full mt-5 border border-gray-200 rounded-lg" style={{ aspectRatio: '800 / 620' }} />

        <div className="w-full mt-5 space-y-2">
          {canRecordAnother && (
            <Button className="w-full justify-center" onClick={onRecordAnother}>Record Another Payment</Button>
          )}
          <Button variant="outline" className="w-full justify-center" onClick={downloadReceipt}>Download Receipt (PNG)</Button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 mt-1">Close</button>
        </div>
      </div>
    </Modal>
  )
}
