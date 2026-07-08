'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { PREFERRED_PRODUCT_CATEGORIES } from '@/lib/constants'
import { FileUploadField } from './FileUploadField'
import type { ClientFormValues } from './types'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select category' },
  ...PREFERRED_PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c })),
]

interface StepAssetsOrderProps {
  clientId?: string
}

export function StepAssetsOrder({ clientId }: StepAssetsOrderProps) {
  const { register, watch, setValue, control, formState: { errors } } = useFormContext<ClientFormValues>()
  const assets = watch('assets')
  const { fields, append, remove } = useFieldArray({ control, name: 'productPreferences' })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Brand Assets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileUploadField label="Company Logo" clientId={clientId} field="companyLogo" value={assets.companyLogo} onChange={(v) => setValue('assets.companyLogo', v)} />
          <FileUploadField label="Brand Guidelines" clientId={clientId} field="brandGuidelines" value={assets.brandGuidelines} onChange={(v) => setValue('assets.brandGuidelines', v)} />
          <FileUploadField label="Artwork References" clientId={clientId} field="artworkReferences" value={assets.artworkReferences} onChange={(v) => setValue('assets.artworkReferences', v)} />
          <FileUploadField label="Previous Designs (If any)" clientId={clientId} field="previousDesigns" value={assets.previousDesigns} onChange={(v) => setValue('assets.previousDesigns', v)} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Shared Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Google Drive Folder" placeholder="https://drive.google.com/..." error={errors.sharedLinks?.googleDriveFolder?.message} {...register('sharedLinks.googleDriveFolder')} />
          <Input label="Dropbox Folder" placeholder="Optional" error={errors.sharedLinks?.dropboxFolder?.message} {...register('sharedLinks.dropboxFolder')} />
          <Input label="Website URL" placeholder="https://..." error={errors.sharedLinks?.websiteUrl?.message} {...register('sharedLinks.websiteUrl')} />
          <Input label="Social Media" placeholder="Optional" error={errors.sharedLinks?.socialMedia?.message} {...register('sharedLinks.socialMedia')} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Order Preferences</h3>
        <p className="text-xs text-gray-400 mb-3">
          For sales reference only — this does not place an order. Create an actual order for this client from the Orders tab once they&apos;re saved.
        </p>
        <Input label="Expected Delivery Date *" type="date" error={errors.deliveryDate?.message} {...register('deliveryDate')} />

        {fields.map((field, index) => (
          <div key={field.id} className={index > 0 ? 'mt-4 pt-4 border-t border-gray-200' : 'mt-4'}>
            {index > 0 && (
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Preference</h4>
                <button type="button" onClick={() => remove(index)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Preferred Product Categories*"
                options={CATEGORY_OPTIONS}
                error={errors.productPreferences?.[index]?.preferredProductCategory?.message}
                {...register(`productPreferences.${index}.preferredProductCategory`)}
              />
              <Input
                label="Preferred Quantity*"
                type="number"
                min={1}
                placeholder="Optional"
                error={errors.productPreferences?.[index]?.orderQuantity?.message}
                {...register(`productPreferences.${index}.orderQuantity`)}
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Note*"
                placeholder="Detail description of what they typically order — color, size..."
                error={errors.productPreferences?.[index]?.orderNote?.message}
                {...register(`productPreferences.${index}.orderNote`)}
              />
            </div>
          </div>
        ))}

        <label className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={fields.length > 1}
            onChange={(e) => {
              if (e.target.checked) {
                append({ preferredProductCategory: '', orderQuantity: '', orderNote: '' })
              } else if (fields.length > 1) {
                // Remove every row except the base row (index 0) in a single
                // batched operation — looping remove() calls against a stale
                // `fields` closure never converges since remove() updates
                // RHF state asynchronously.
                remove(fields.map((_, i) => i).slice(1))
              }
            }}
          />
          Add other product
        </label>
      </div>

      <Textarea label="Notes" placeholder="Optional" error={errors.notes?.message} {...register('notes')} />
    </div>
  )
}
