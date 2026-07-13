'use client'

import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { ClientFormValues } from './types'

export function StepBasicInfo() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<ClientFormValues>()
  const billingSameAsShipping = watch('billingSameAsShipping')
  const shippingAddress = watch('shippingAddress')

  useEffect(() => {
    if (billingSameAsShipping) {
      setValue('billingAddress', shippingAddress, { shouldDirty: false })
    }
    // Shipping is the address the user fills in first; only re-sync billing
    // from it while the toggle is on. Unchecking leaves billing untouched
    // (and editable) at whatever it last synced to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingSameAsShipping, shippingAddress.pinCode, shippingAddress.city, shippingAddress.state, shippingAddress.country, shippingAddress.landmark])

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
          <Input label="Email Address" type="email" placeholder="Optional" error={errors.email?.message} {...register('email')} />
        </div>
      </div>

      <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-green-200 bg-green-50 cursor-pointer">
        <input type="checkbox" className="hidden" {...register('billingSameAsShipping')} />
        <CheckCircle2 size={18} className={billingSameAsShipping ? 'text-green-600' : 'text-gray-300'} />
        <span className="text-sm text-green-800 font-medium">Billing and shipping address are the same</span>
      </label>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Shipping Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="PIN Code *" error={errors.shippingAddress?.pinCode?.message} {...register('shippingAddress.pinCode')} />
          <Input label="City" error={errors.shippingAddress?.city?.message} {...register('shippingAddress.city')} />
          <Input label="State" error={errors.shippingAddress?.state?.message} {...register('shippingAddress.state')} />
          <Input label="Country" error={errors.shippingAddress?.country?.message} {...register('shippingAddress.country')} />
        </div>
        <div className="mt-4">
          <Input label="Landmark/House/Building No." error={errors.shippingAddress?.landmark?.message} {...register('shippingAddress.landmark')} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Billing Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="PIN Code *" disabled={billingSameAsShipping} error={errors.billingAddress?.pinCode?.message} {...register('billingAddress.pinCode')} />
          <Input label="City" disabled={billingSameAsShipping} error={errors.billingAddress?.city?.message} {...register('billingAddress.city')} />
          <Input label="State" disabled={billingSameAsShipping} error={errors.billingAddress?.state?.message} {...register('billingAddress.state')} />
          <Input label="Country" disabled={billingSameAsShipping} error={errors.billingAddress?.country?.message} {...register('billingAddress.country')} />
        </div>
        <div className="mt-4">
          <Input label="Landmark/House/Building No." disabled={billingSameAsShipping} error={errors.billingAddress?.landmark?.message} {...register('billingAddress.landmark')} />
        </div>
      </div>
    </div>
  )
}
