'use client'

import { useState } from 'react'
import { Download, Printer, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PAYMENT_STATUS_COLOR } from '@/lib/constants'
import { COMPANY_PROFILE, totalGst } from './types'
import type { IClient, IOrder, PaymentStatus } from '@/types'

interface InvoicePreviewModalProps {
  order: IOrder | null
  onClose: () => void
  onReplace: (order: IOrder) => void
  onUpdated: () => void
}

export function InvoicePreviewModal({ order, onClose, onReplace, onUpdated }: InvoicePreviewModalProps) {
  const [saving, setSaving] = useState(false)

  if (!order || !order.invoice) return null

  const invoice = order.invoice
  const client = order.client as IClient
  const gst = totalGst(invoice.amount, invoice.cgstPercent, invoice.sgstPercent)
  const grandTotal = invoice.amount + gst
  const advancePaid = order.advancePaid ?? 0
  const balanceDue = Math.max(0, grandTotal - advancePaid)
  const rate = order.quantity > 0 ? invoice.amount / order.quantity : invoice.amount

  const toggleSent = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${order._id}/invoice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentToClient: !invoice.sentToClient }),
      })
      const data = await res.json()
      if (data.success) onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        <div className="flex-1 overflow-y-auto p-8" id="invoice-print-area">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-bold">UN</div>
              <div>
                <p className="font-bold text-gray-900">{COMPANY_PROFILE.name}</p>
                <p className="text-xs text-gray-500">{COMPANY_PROFILE.addressLine1}</p>
                <p className="text-xs text-gray-500">{COMPANY_PROFILE.addressLine2}</p>
                <p className="text-xs text-gray-500">GST: {COMPANY_PROFILE.gstNumber}</p>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 uppercase">
              {invoice.invoiceType === 'tax_invoice' ? 'Tax Invoice' : invoice.invoiceType === 'proforma_invoice' ? 'Proforma Invoice' : 'Receipt'}
            </h2>
          </div>

          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bill To</p>
              <p className="font-semibold text-gray-900">{client?.companyName}</p>
              {client?.contactPersonName && <p className="text-sm text-gray-600">{client.contactPersonName}</p>}
              {client?.billingAddress && (
                <p className="text-sm text-gray-600">
                  {[client.billingAddress.landmark, client.billingAddress.city, client.billingAddress.state, client.billingAddress.pinCode].filter(Boolean).join(', ')}
                </p>
              )}
              {client?.gstNumber && <p className="text-sm text-gray-600">GST: {client.gstNumber}</p>}
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
              <p className="text-gray-500">Date: {formatDate(invoice.invoiceDate)}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase">
                <th className="text-left py-2">Item Description</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Rate</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3">
                  <p className="font-medium text-gray-900">{order.productType}</p>
                  <p className="text-xs text-gray-400">{order.category}{order.sizeBreakdown ? ` · ${order.sizeBreakdown}` : ''}</p>
                </td>
                <td className="text-right py-3">{order.quantity.toLocaleString()}</td>
                <td className="text-right py-3">{formatCurrency(rate)}</td>
                <td className="text-right py-3">{formatCurrency(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(invoice.amount)}</span></div>
            {invoice.cgstPercent ? <div className="flex justify-between"><span className="text-gray-500">CGST {invoice.cgstPercent}%</span><span>{formatCurrency(invoice.amount * invoice.cgstPercent / 100)}</span></div> : null}
            {invoice.sgstPercent ? <div className="flex justify-between"><span className="text-gray-500">SGST {invoice.sgstPercent}%</span><span>{formatCurrency(invoice.amount * invoice.sgstPercent / 100)}</span></div> : null}
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{formatCurrency(grandTotal)}</span></div>
            <div className="flex justify-between text-green-600"><span>Amount Paid</span><span>{formatCurrency(advancePaid)}</span></div>
            {/* An invoice can no longer be created or edited (see PATCH
                /api/orders/[id]/invoice) while this would be positive — this
                only ever renders for an invoice that predates that guard. */}
            {balanceDue > 0 && (
              <div className="flex justify-between font-bold text-red-600"><span>Balance Due</span><span>{formatCurrency(balanceDue)}</span></div>
            )}
          </div>

          <p className="text-sm text-gray-600 italic mt-8">&quot;Thank you for your business&quot;</p>

          <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400">
            <div>
              <p className="font-semibold text-gray-500">Bank Details</p>
              <p>{COMPANY_PROFILE.bankName}</p>
              <p>IFSC: {COMPANY_PROFILE.ifsc}</p>
              <p>A/C: {COMPANY_PROFILE.accountNumber}</p>
            </div>
            <p>This is a computer generated invoice</p>
          </div>
        </div>

        <div className="w-64 border-l border-gray-100 p-5 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
            {order.paymentStatus && <Badge label={order.paymentStatus.toUpperCase()} className={PAYMENT_STATUS_COLOR[order.paymentStatus as PaymentStatus]} />}
          </div>
          <p className="text-sm text-gray-500 -mt-2">{client?.companyName} · {order.orderNumber}</p>

          <Button icon={<Download size={14} />} onClick={() => window.print()}>Download PDF</Button>
          <Button variant="outline" icon={<Printer size={14} />} onClick={() => window.print()}>Print Invoice</Button>

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-700">Mark as Sent to Client</span>
            <button
              onClick={toggleSent} disabled={saving}
              className={`w-10 h-5.5 rounded-full transition-colors relative ${invoice.sentToClient ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform ${invoice.sentToClient ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {invoice.sentToClient && invoice.sentAt && (
            <p className="text-xs text-blue-600">Sent on {formatDate(invoice.sentAt)}</p>
          )}

          <button onClick={() => onReplace(order)} className="text-sm text-red-600 hover:underline mt-auto flex items-center gap-1">
            <RotateCcw size={13} /> Replace Invoice
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">Close Preview</button>
        </div>
      </div>
    </div>
  )
}
