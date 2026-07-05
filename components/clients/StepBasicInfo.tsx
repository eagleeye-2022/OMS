'use client'

import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { ClientFormValues } from './types'

export function StepBasicInfo() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<ClientFormValues>()
  const sameAsBilling = watch('sameAsBilling')
  const billingAddress = watch('billingAddress')

  useEffect(() => {
    if (sameAsBilling) {
      setValue('shippingAddress', billingAddress, { shouldDirty: false })
    }
    // Only re-sync when billing fields change while the toggle is on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsBilling, billingAddress.pinCode, billingAddress.city, billingAddress.state, billingAddress.country, billingAddress.landmark])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Details</h3>
        <div className="space-y-4">
          <Input label="Client / Company Name *" placeholder="e.g. Acme Printing Solutions" error={errors.companyName?.message} {...register('companyName')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Contact Person Name *" placeholder="e.g. John Doe" error={errors.contactPersonName?.message} {...register('contactPersonName')} />
            <Input label="Designation" placeholder="e.g. Procurement Lead" error={errors.designation?.message} {...register('designation')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone Number *" placeholder="+91 00000 00000" error={errors.phone?.message} {...register('phone')} />
            <Input label="Alternate Phone" placeholder="Optional" error={errors.alternatePhone?.message} {...register('alternatePhone')} />
          </div>
          <Input label="Email Address *" type="email" placeholder="client@example.com" error={errors.email?.message} {...register('email')} />
        </div>
      </div>

      <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-green-200 bg-green-50 cursor-pointer">
        <input type="checkbox" className="hidden" {...register('sameAsBilling')} />
        <CheckCircle2 size={18} className={sameAsBilling ? 'text-green-600' : 'text-gray-300'} />
        <span className="text-sm text-green-800 font-medium">Billing and shipping address are the same</span>
      </label>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Billing Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="PIN Code *" error={errors.billingAddress?.pinCode?.message} {...register('billingAddress.pinCode')} />
          <Input label="City" error={errors.billingAddress?.city?.message} {...register('billingAddress.city')} />
          <Input label="State" error={errors.billingAddress?.state?.message} {...register('billingAddress.state')} />
          <Input label="Country" error={errors.billingAddress?.country?.message} {...register('billingAddress.country')} />
        </div>
        <div className="mt-4">
          <Input label="Landmark/House/Building No." error={errors.billingAddress?.landmark?.message} {...register('billingAddress.landmark')} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Shipping Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="PIN Code *" disabled={sameAsBilling} error={errors.shippingAddress?.pinCode?.message} {...register('shippingAddress.pinCode')} />
          <Input label="City" disabled={sameAsBilling} error={errors.shippingAddress?.city?.message} {...register('shippingAddress.city')} />
          <Input label="State" disabled={sameAsBilling} error={errors.shippingAddress?.state?.message} {...register('shippingAddress.state')} />
          <Input label="Country" disabled={sameAsBilling} error={errors.shippingAddress?.country?.message} {...register('shippingAddress.country')} />
        </div>
        <div className="mt-4">
          <Input label="Landmark/House/Building No." disabled={sameAsBilling} error={errors.shippingAddress?.landmark?.message} {...register('shippingAddress.landmark')} />
        </div>
      </div>
    </div>
  )
}
