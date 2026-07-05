'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { PAYMENT_STATUS_COLOR, PAYMENT_METHODS } from '@/lib/constants'
import type { IOrder, PaymentStatus } from '@/types'

interface OrderFinanceCardProps {
  order: IOrder
  onPaymentLogged: () => void
}

function LogPaymentModal({ order, onClose, onSaved }: { order: IOrder; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(order.balanceDue ?? 0))
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const clientId = typeof order.client === 'string' ? order.client : order.client._id
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: order._id,
          client: clientId,
          amount: Number(amount),
          paymentDate: new Date().toISOString().split('T')[0],
          method,
          reference,
        }),
      })
      const data = await res.json()
      if (data.success) onSaved()
      else setError(data.error || 'Failed to log payment')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Amount (₹) *" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <Select
        label="Payment Method *"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        required
        options={[{ value: '', label: 'Select method' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]}
      />
      <Input label="Reference No." value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving}>Log Payment</Button>
      </div>
    </form>
  )
}

export function OrderFinanceCard({ order, onPaymentLogged }: OrderFinanceCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  if (order.totalAmount == null) return null

  const totalAmount = order.totalAmount
  const advancePaid = order.advancePaid ?? 0
  const balanceDue = order.balanceDue ?? 0
  const progress = totalAmount > 0 ? Math.round((advancePaid / totalAmount) * 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing & Payments</h3>
        {order.paymentStatus && (
          <Badge label={order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)} className={PAYMENT_STATUS_COLOR[order.paymentStatus as PaymentStatus]} />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Order Value</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Advance Received</span>
          <span className="text-sm font-semibold text-green-600">{formatCurrency(advancePaid)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Balance Due</span>
          <span className={`text-sm font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balanceDue)}</span>
        </div>
      </div>

      {balanceDue > 0 && (
        <Button variant="outline" className="w-full justify-center mt-4" onClick={() => setModalOpen(true)}>Log Payment</Button>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Payment" size="sm">
        <LogPaymentModal order={order} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); onPaymentLogged() }} />
      </Modal>
    </div>
  )
}
