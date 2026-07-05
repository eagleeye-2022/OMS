'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { IClient, IOrder, IPayment } from '@/types'

const QUICK_METHODS = ['Bank Transfer', 'UPI', 'Cash', 'Cheque']

interface RecordPaymentFormProps {
  order: IOrder
  onRecorded: (payment: IPayment) => void
}

export function RecordPaymentForm({ order, onRecorded }: RecordPaymentFormProps) {
  const balanceDue = order.balanceDue ?? 0
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (balanceDue <= 0) return null

  const quickAmounts = [10000, 25000, 50000].filter((a) => a < balanceDue)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) { setError('Enter a valid payment amount'); return }
    if (numAmount > balanceDue) { setError(`Amount cannot exceed the balance due (₹${balanceDue.toLocaleString('en-IN')})`); return }
    if (!method) { setError('Select a payment method'); return }

    setSaving(true)
    setError('')
    try {
      const clientId = typeof order.client === 'string' ? order.client : (order.client as IClient)._id
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: order._id,
          client: clientId,
          amount: numAmount,
          paymentDate: new Date().toISOString().split('T')[0],
          method,
          reference: reference || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAmount(''); setMethod(''); setReference('')
        onRecorded(data.data)
      } else {
        setError(data.error || 'Failed to record payment')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Record New Payment</h3>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Payment Amount</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {quickAmounts.map((a) => (
              <button key={a} type="button" onClick={() => setAmount(String(a))} className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
            <button type="button" onClick={() => setAmount(String(balanceDue))} className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
              Full Balance
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Method</label>
          <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-lg p-1 text-xs">
            {QUICK_METHODS.map((m) => (
              <button
                key={m} type="button" onClick={() => setMethod(m)}
                className={cn('py-1.5 rounded-md font-medium transition-colors', method === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
              >
                {m === 'Bank Transfer' ? 'NEFT' : m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <input
          value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference / UTR number (optional)"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit" disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Recording…' : 'Mark Payment Received'}
        </button>
      </form>
    </div>
  )
}
