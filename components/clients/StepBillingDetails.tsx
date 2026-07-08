'use client'

import { useFormContext } from 'react-hook-form'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { PAYMENT_TERMS_LABEL, PREFERRED_PAYMENT_MODE_LABEL } from '@/lib/constants'
import type { ClientFormValues } from './types'

const CLIENT_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate' },
]

const PAYMENT_TERMS_OPTIONS = [
  { value: '', label: 'Select payment terms' },
  ...Object.entries(PAYMENT_TERMS_LABEL).map(([value, label]) => ({ value, label })),
]

const PAYMENT_MODE_OPTIONS = [
  { value: '', label: 'Select payment mode' },
  ...Object.entries(PREFERRED_PAYMENT_MODE_LABEL).map(([value, label]) => ({ value, label })),
]

export function StepBillingDetails() {
  const { register, watch, formState: { errors } } = useFormContext<ClientFormValues>()
  const clientType = watch('clientType')
  const paymentTerms = watch('defaultPaymentTerms')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Client Type *" options={CLIENT_TYPE_OPTIONS} error={errors.clientType?.message} {...register('clientType')} />
        <Input
          label={`GST Number${clientType === 'corporate' ? ' *' : ''}`}
          placeholder="27XXXXX0000X1Z5"
          hint="Optional for Individuals, mandatory for Corporate accounts."
          error={errors.gstNumber?.message}
          {...register('gstNumber')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Default Advance Requirement (%)"
          type="number"
          min={0}
          max={100}
          placeholder="50"
          error={errors.defaultAdvanceRequirement?.message}
          {...register('defaultAdvanceRequirement')}
        />
        <Select label="Default Payment Terms" options={PAYMENT_TERMS_OPTIONS} error={errors.defaultPaymentTerms?.message} {...register('defaultPaymentTerms')} />
      </div>

      {paymentTerms === 'custom' && (
        <Textarea
          label="Custom Payment Terms *"
          placeholder="Describe the custom payment terms"
          error={errors.customPaymentTerms?.message}
          {...register('customPaymentTerms')}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Preferred Payment Mode" options={PAYMENT_MODE_OPTIONS} error={errors.preferredPaymentMode?.message} {...register('preferredPaymentMode')} />
        <Input label="Alternate Phone" placeholder="Optional" error={errors.alternatePhone?.message} {...register('alternatePhone')} />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Typical Order Value</label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 25000"
            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('typicalOrderValue')}
          />
        </div>
        {errors.typicalOrderValue ? (
          <p className="text-xs text-red-600 mt-1">{errors.typicalOrderValue.message}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            A sales-reference estimate of this client&apos;s typical order size — not an actual order total. Orders are created and priced in the Orders module.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-2">Invoicing Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Invoice Recipient Name *" error={errors.invoiceRecipientName?.message} {...register('invoiceRecipientName')} />
          <Input label="Invoice Email *" type="email" placeholder="Optional" error={errors.invoiceEmail?.message} {...register('invoiceEmail')} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-2">Escalation Contact</h3>
        <p className="text-xs text-gray-500 mb-3">This contact will only be used for payment-related escalations if invoices remain unpaid beyond the agreed payment terms.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Recipient Name *" error={errors.escalationContact?.recipientName?.message} {...register('escalationContact.recipientName')} />
          <Input label="Email *" type="email" placeholder="Optional" error={errors.escalationContact?.email?.message} {...register('escalationContact.email')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Input label="Mobile Number *" error={errors.escalationContact?.mobileNumber?.message} {...register('escalationContact.mobileNumber')} />
          <Input label="Address *" placeholder="Optional" error={errors.escalationContact?.address?.message} {...register('escalationContact.address')} />
        </div>
      </div>
    </div>
  )
}
