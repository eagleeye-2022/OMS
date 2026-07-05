'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isOrderOverdue } from './types'
import type { IClient, IOrder } from '@/types'

interface OverdueReminderModalProps {
  order: IOrder | null
  onClose: () => void
}

export function OverdueReminderModal({ order, onClose }: OverdueReminderModalProps) {
  const [emailChecked, setEmailChecked] = useState(true)
  const [whatsappChecked, setWhatsappChecked] = useState(true)
  const [internalChecked, setInternalChecked] = useState(false)
  const [escalationNote, setEscalationNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sentResult, setSentResult] = useState<{ loggedAt: string; loggedBy: string; clientName: string } | null>(null)

  if (!order) return null

  const client = order.client as IClient
  const balanceDue = order.balanceDue ?? 0
  const daysLate = Math.max(0, Math.ceil((Date.now() - new Date(order.deliveryDate).getTime()) / 86400000))
  const clientEmail = client?.invoiceEmail || client?.email
  const clientPhone = client?.phone

  const close = () => {
    setEmailChecked(true); setWhatsappChecked(true); setInternalChecked(false)
    setEscalationNote(''); setError(''); setSentResult(null)
    onClose()
  }

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}/payment-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: { email: emailChecked, whatsapp: whatsappChecked, internal: internalChecked },
          escalationNote: escalationNote || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSentResult({ loggedAt: data.data.loggedAt, loggedBy: data.data.loggedBy, clientName: client?.companyName || '' })
      } else {
        setError(data.error || 'Failed to send reminder')
      }
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  if (sentResult) {
    return (
      <Modal open onClose={close} size="sm">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Reminder Sent!</h2>
          <p className="text-sm text-gray-500 mt-1">{sentResult.clientName} has been notified</p>
          <p className="text-xs text-gray-400 mt-2">Logged at {formatDate(sentResult.loggedAt)} · by {sentResult.loggedBy}</p>
          <Button className="w-full justify-center mt-5" onClick={close}>Close</Button>
        </div>
      </Modal>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Send Overdue Payment Reminder?</h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="border border-red-100 bg-red-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm">{order.orderNumber} · {client?.companyName}</span>
            {order.invoice?.invoiceNumber && <Badge label={order.invoice.invoiceNumber} className="bg-white border border-gray-200 text-gray-600" />}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge label={`${formatCurrency(balanceDue)} overdue`} className="bg-red-600 text-white" />
            <Badge label={`Due ${formatDate(order.deliveryDate)}`} className="bg-gray-100 text-gray-600" />
            {isOrderOverdue(order) && <Badge label={`${daysLate} days late`} className="bg-red-100 text-red-700" />}
          </div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Message that will be sent</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-600">
          {clientEmail && <p className="text-xs text-gray-400 mb-1">To: {clientEmail}</p>}
          <p className="italic">
            Dear {client?.companyName} team, this is a reminder that payment of {formatCurrency(balanceDue)} against Order {order.orderNumber} was due on {formatDate(order.deliveryDate)} and is now overdue. Kindly arrange the payment at the earliest.
          </p>
        </div>

        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={emailChecked} onChange={(e) => setEmailChecked(e.target.checked)} className="rounded" />
            Client email{clientEmail ? ` (${clientEmail})` : ''}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={whatsappChecked} onChange={(e) => setWhatsappChecked(e.target.checked)} className="rounded" />
            Client WhatsApp{clientPhone ? ` (+91 ${clientPhone})` : ''}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={internalChecked} onChange={(e) => setInternalChecked(e.target.checked)} className="rounded" />
            Internal team
          </label>
        </div>

        <label className="text-sm font-medium text-gray-700">Escalation note (optional)</label>
        <textarea
          value={escalationNote} onChange={(e) => setEscalationNote(e.target.value)} rows={2}
          placeholder="Add context for the internal logs..."
          className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">This action will be logged with timestamp</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
            <Button size="sm" loading={sending} onClick={send}>Send Reminder</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
