'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { UserPlus2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ClientWizard } from '@/components/clients/ClientWizard'
import { PRODUCT_CATEGORIES, PRIORITY_LABEL } from '@/lib/constants'
import { orderSchema, updateOrderCoreSchema } from '@/validations/order.schema'
import { emptyOrderFormValues, mapOrderToFormValues, buildCreateOrderPayload, buildEditOrderPayload, type OrderFormValues } from './types'
import type { IClient, IOrder } from '@/types'

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))

/** ₹-prefixed number input — mirrors the pattern already used for money fields in RecordPaymentForm/StepBillingDetails. */
function CurrencyField({ label, required, error, registration }: { label: string; required?: boolean; error?: string; registration: UseFormRegisterReturn }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
        <input
          type="number" min={0} step="0.01"
          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...registration}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

interface CreateOrderModalProps {
  open: boolean
  initialOrder?: IOrder | null
  onClose: () => void
  onSaved: () => void
}

export function CreateOrderModal({ open, initialOrder, onClose, onSaved }: CreateOrderModalProps) {
  const [clients, setClients] = useState<IClient[]>([])
  const [clientWizardOpen, setClientWizardOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(initialOrder?._id)

  const { register, getValues, reset, watch } = useForm<OrderFormValues>({
    defaultValues: initialOrder ? mapOrderToFormValues(initialOrder) : emptyOrderFormValues(),
  })

  const loadClients = useCallback(async (selectClientId?: string) => {
    const res = await fetch('/api/clients?limit=200&status=active')
    const data = await res.json()
    if (data.success) {
      setClients(data.data)
      if (selectClientId) {
        reset({ ...getValues(), client: selectClientId })
      }
    }
  }, [reset, getValues])

  useEffect(() => {
    if (open) {
      reset(initialOrder ? mapOrderToFormValues(initialOrder) : emptyOrderFormValues())
      setError('')
      loadClients()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialOrder])

  if (!open) return null

  if (clientWizardOpen) {
    return (
      <ClientWizard
        open
        onClose={() => setClientWizardOpen(false)}
        onSaved={async (client) => {
          setClientWizardOpen(false)
          await loadClients(client._id)
        }}
      />
    )
  }

  const handleSave = async () => {
    setError('')
    const values = getValues()

    if (isEdit) {
      const payload = buildEditOrderPayload(values)
      const parsed = updateOrderCoreSchema.safeParse(payload)
      if (!parsed.success) { setError(parsed.error.issues[0].message); return }

      setSaving(true)
      try {
        const res = await fetch(`/api/orders/${initialOrder!._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to update order')
        onSaved()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update order')
      } finally {
        setSaving(false)
      }
    } else {
      const payload = buildCreateOrderPayload(values)
      const parsed = orderSchema.safeParse(payload)
      if (!parsed.success) { setError(parsed.error.issues[0].message); return }

      setSaving(true)
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to create order')
        onSaved()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create order')
      } finally {
        setSaving(false)
      }
    }
  }

  const currentClient = watch('client')

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Order Details' : 'Create New Order'} size="lg">
      <div className="space-y-5">
        <div>
          <Select
            label="Client *"
            disabled={isEdit}
            required
            options={[{ value: '', label: 'Select Client' }, ...clients.map((c) => ({ value: c._id, label: c.companyName }))]}
            {...register('client')}
          />
          {!isEdit && (
            <button
              type="button"
              onClick={() => setClientWizardOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <UserPlus2 size={12} /> Add New Client
            </button>
          )}
          {!isEdit && !currentClient && clients.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No clients yet — add one first.</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Delivery Date *" type="date" required {...register('deliveryDate')} />
            <Select label="Priority" options={PRIORITY_OPTIONS} {...register('priority')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Select
              label="Preferred Product Categories *"
              required
              options={[{ value: '', label: 'Select category' }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))]}
              {...register('category')}
            />
            <Input label="Order Quantity *" type="number" min="1" required {...register('quantity')} />
          </div>

          <div className="mt-4">
            <Textarea
              label="Order Note *"
              rows={4}
              placeholder="Detail Description of order like color, size..."
              required
              {...register('productType')}
            />
          </div>

          {isEdit && (
            <div className="mt-4">
              <Input label="Size Breakdown" placeholder="e.g. S:200, M:400, L:400" {...register('sizeBreakdown')} />
            </div>
          )}

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <CurrencyField label="Total Amount of Order" required registration={register('totalAmount')} />
              <CurrencyField label="Advance Received" registration={register('advancePaid')} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant={isEdit ? 'primary' : 'dark'} type="button" loading={saving} onClick={handleSave}>
            {isEdit ? 'Save Changes' : 'Create Order'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
