'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Send, Cloud, Download, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency, formatFileSize } from '@/lib/utils'
import { ALLOWED_UPLOAD_ACCEPT, validateUploadFile } from '@/lib/upload'
import { totalGst } from './types'
import type { IClient, IOrder } from '@/types'

const INVOICE_TYPES: { value: 'tax_invoice' | 'proforma_invoice' | 'receipt'; label: string }[] = [
  { value: 'tax_invoice', label: 'Tax Invoice' },
  { value: 'proforma_invoice', label: 'Proforma Invoice' },
  { value: 'receipt', label: 'Receipt' },
]

interface InvoiceUploadModalProps {
  order: IOrder | null
  onClose: () => void
  onSaved: () => void
}

export function InvoiceUploadModal({ order, onClose, onSaved }: InvoiceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [invoiceType, setInvoiceType] = useState<'tax_invoice' | 'proforma_invoice' | 'receipt'>('tax_invoice')
  const [cgstPercent, setCgstPercent] = useState('9')
  const [sgstPercent, setSgstPercent] = useState('9')
  const [notes, setNotes] = useState('')
  const [sendToClient, setSendToClient] = useState(true)
  const [isFinal, setIsFinal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ invoiceNumber: string; clientName: string } | null>(null)

  // Pre-fill from the order's existing invoice when reopening to replace it
  // (e.g. "Replace Invoice" from the preview panel) so swapping just the file
  // doesn't silently reset invoiceNumber/amount/isFinal/sentToClient back to
  // form defaults. A brand-new upload (no existing invoice) still starts blank.
  useEffect(() => {
    if (!order) return
    const inv = order.invoice
    setFile(null)
    setError('')
    setResult(null)
    if (inv) {
      setInvoiceNumber(inv.invoiceNumber)
      setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : '')
      setAmount(String(inv.amount))
      setDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : '')
      setInvoiceType(inv.invoiceType)
      setCgstPercent(inv.cgstPercent != null ? String(inv.cgstPercent) : '9')
      setSgstPercent(inv.sgstPercent != null ? String(inv.sgstPercent) : '9')
      setNotes(inv.notes || '')
      setSendToClient(inv.sentToClient)
      setIsFinal(inv.isFinal)
    } else {
      setInvoiceNumber('')
      setInvoiceDate('')
      setAmount('')
      setDueDate('')
      setInvoiceType('tax_invoice')
      setCgstPercent('9')
      setSgstPercent('9')
      setNotes('')
      setSendToClient(true)
      setIsFinal(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id])

  if (!order) return null

  const client = order.client as IClient

  const reset = () => {
    setFile(null); setInvoiceNumber(''); setInvoiceDate(''); setAmount(''); setDueDate('')
    setInvoiceType('tax_invoice'); setCgstPercent('9'); setSgstPercent('9'); setNotes('')
    setSendToClient(true); setIsFinal(false); setError(''); setResult(null)
  }

  const close = () => { reset(); onClose() }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const validationError = validateUploadFile(f)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }
    setError('')
    setFile(f)
    if (!invoiceNumber) setInvoiceNumber(`INV-${order.orderNumber.replace('ORD-', '')}`)
    // order.totalAmount is what the client actually agreed to pay and what
    // payments are collected against (see RecordPaymentForm/POST
    // /api/payments — both cap at order.totalAmount, there is no separate
    // "plus GST" collection step). So it must be treated as GST-inclusive
    // here: the invoice's line amount is the taxable value backed *out* of
    // it, not order.totalAmount with GST stacked on top — the latter was
    // exactly what silently manufactured a "Balance Due" on invoices that
    // real accounts staff never actually asked the client to pay. Floored
    // (not rounded) so amount + GST never exceeds order.totalAmount even
    // after the GST line's own rounding, matching PATCH
    // /api/orders/[id]/invoice's server-side guard exactly.
    if (!amount && order.totalAmount != null) {
      const gstRate = ((Number(cgstPercent) || 0) + (Number(sgstPercent) || 0)) / 100
      const taxableValue = gstRate > 0 ? Math.floor(order.totalAmount / (1 + gstRate)) : order.totalAmount
      setAmount(String(taxableValue))
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoiceNumber || !amount) { setError('Invoice number and amount are required'); return }

    setSaving(true)
    setError('')
    try {
      let fileMeta: { url: string; originalName: string; size: number } | null = null
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('orderId', order._id)
        formData.append('field', 'invoice')
        const upRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const upData = await upRes.json()
        if (!upData.success) { setError(upData.error || 'File upload failed'); setSaving(false); return }
        fileMeta = upData.data
      }

      const res = await fetch(`/api/orders/${order._id}/invoice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          invoiceType,
          invoiceDate: invoiceDate || undefined,
          amount: Number(amount),
          cgstPercent: cgstPercent ? Number(cgstPercent) : undefined,
          sgstPercent: sgstPercent ? Number(sgstPercent) : undefined,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          isFinal,
          sentToClient: sendToClient,
          ...(fileMeta ? { fileUrl: fileMeta.url, fileName: fileMeta.originalName, fileSize: fileMeta.size } : {}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ invoiceNumber, clientName: client?.companyName || '' })
      } else {
        setError(data.error || 'Failed to save invoice')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const gst = totalGst(Number(amount) || 0, Number(cgstPercent) || 0, Number(sgstPercent) || 0)

  if (result) {
    return (
      <Modal open onClose={() => { onSaved(); close() }} size="sm">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Invoice Uploaded Successfully!</h2>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-semibold">{result.invoiceNumber}</span> has been saved{sendToClient ? ` and sent to ${result.clientName}` : ''}
          </p>
          <div className="w-full mt-5 space-y-2">
            <Button className="w-full justify-center" onClick={() => { onSaved(); close() }}>Close</Button>
            <Button variant="outline" icon={<Download size={14} />} className="w-full justify-center" onClick={() => { onSaved(); close() }}>Download</Button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-gray-300">
            <FileText size={16} /> <Send size={16} /> <Cloud size={16} />
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={close} title={`Upload Invoice — ${order.orderNumber} · ${client?.companyName || ''}`} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {file ? (
          <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <span>File ready to upload — {file.name} ({formatFileSize(file.size)})</span>
            <button type="button" onClick={() => setFile(null)} className="text-red-600 hover:underline flex items-center gap-1">
              <X size={12} /> Remove
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 cursor-pointer hover:border-gray-400">
            <input type="file" accept={ALLOWED_UPLOAD_ACCEPT} className="hidden" onChange={handleFile} />
            Click to select an invoice file (PDF, image)
          </label>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice Number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
          <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice Amount (₹)" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Invoice Type</label>
          <div className="grid grid-cols-3 gap-1 bg-gray-100 rounded-lg p-1 text-sm">
            {INVOICE_TYPES.map((t) => (
              <button
                key={t.value} type="button" onClick={() => setInvoiceType(t.value)}
                className={cn('py-1.5 rounded-md font-medium transition-colors', invoiceType === t.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">GST Breakdown (Optional)</p>
          <div className="grid grid-cols-3 gap-4">
            <Input label="CGST %" type="number" min="0" max="100" value={cgstPercent} onChange={(e) => setCgstPercent(e.target.value)} />
            <Input label="SGST %" type="number" min="0" max="100" value={sgstPercent} onChange={(e) => setSgstPercent(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-gray-700">Total GST</label>
              <p className="mt-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-600">{formatCurrency(gst)}</p>
            </div>
          </div>
        </div>

        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional remarks..." rows={2} />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={sendToClient} onChange={(e) => setSendToClient(e.target.checked)} className="rounded" />
          Send invoice to client email address automatically
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} className="rounded" />
          Mark as final invoice
        </label>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={close}>Cancel</Button>
          <Button type="submit" loading={saving}>Upload Invoice</Button>
        </div>
      </form>
    </Modal>
  )
}
