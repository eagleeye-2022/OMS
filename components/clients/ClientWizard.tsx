'use client'

import { useEffect, useState } from 'react'
import { FormProvider, useForm, type UseFormSetError } from 'react-hook-form'
import { AlertCircle, UserPlus, X } from 'lucide-react'
import type { ZodType } from 'zod'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { StepBasicInfo } from './StepBasicInfo'
import { StepBillingDetails } from './StepBillingDetails'
import { StepAssetsOrder } from './StepAssetsOrder'
import { ClientSuccessModal } from './ClientSuccessModal'
import { clientStep1Schema, clientStep2Schema, clientStep3Schema } from '@/validations/client.schema'
import { emptyClientFormValues, mapClientToFormValues, buildClientPayload, type ClientFormValues } from './types'
import type { IClient } from '@/types'

const STEP_LABELS = ['Basic Info', 'Billing Details', 'Assets & Order']
const STEP_SUBTITLES = ['Step 1 of 3: Primary Identification', 'Step 2 of 3: Billing Details', 'Step 3 of 3: Assets & Order Details']

function applyZodErrors(schema: ZodType, values: unknown, setError: UseFormSetError<ClientFormValues>): boolean {
  const result = schema.safeParse(values)
  if (result.success) return true
  for (const issue of result.error.issues) {
    setError(issue.path.join('.') as Parameters<typeof setError>[0], { type: issue.code, message: issue.message })
  }
  return false
}

interface ClientWizardProps {
  open: boolean
  initialClient?: IClient | null
  onClose: () => void
  onSaved: () => void
}

export function ClientWizard({ open, initialClient, onClose, onSaved }: ClientWizardProps) {
  const [step, setStep] = useState(0)
  const [clientId, setClientId] = useState<string | undefined>(initialClient?._id)
  const [saving, setSaving] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [savedName, setSavedName] = useState('')

  const form = useForm<ClientFormValues>({
    defaultValues: initialClient ? mapClientToFormValues(initialClient) : emptyClientFormValues(),
  })

  useEffect(() => {
    if (open) {
      form.reset(initialClient ? mapClientToFormValues(initialClient) : emptyClientFormValues())
      setClientId(initialClient?._id)
      setStep(0)
      setBannerError('')
      setSuccessOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialClient])

  if (!open) return null

  const persist = async (status: 'draft' | 'active'): Promise<IClient> => {
    const values = form.getValues()
    const payload = buildClientPayload(values, status)
    const url = clientId ? `/api/clients/${clientId}` : '/api/clients'
    const method = clientId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Failed to save client')
    return data.data as IClient
  }

  const handleContinue = async () => {
    form.clearErrors()
    setBannerError('')
    const values = form.getValues()
    const schema = step === 0 ? clientStep1Schema : step === 1 ? clientStep2Schema : clientStep3Schema
    const ok = applyZodErrors(schema, values, form.setError)
    if (!ok) {
      setBannerError('Please fill all required fields before continuing')
      return
    }

    setSaving(true)
    try {
      if (step < 2) {
        const saved = await persist('draft')
        setClientId(saved._id)
        setStep((s) => s + 1)
      } else {
        const saved = await persist('active')
        setSavedName(saved.companyName)
        setSuccessOpen(true)
      }
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to save client')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    form.clearErrors()
    setBannerError('')
    const values = form.getValues()
    if (!values.companyName || values.companyName.trim().length < 2) {
      form.setError('companyName', { type: 'custom', message: 'Client / Company name must be at least 2 characters' })
      setBannerError('Please fill all required fields before continuing')
      return
    }

    setSaving(true)
    try {
      await persist('draft')
      onSaved()
      onClose()
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  const handleRequestClose = () => {
    if (saving) return
    if (form.formState.isDirty) {
      const confirmDiscard = window.confirm('You have unsaved changes on this step. Close without saving?')
      if (!confirmDiscard) return
    }
    onClose()
  }

  const steps = STEP_LABELS.map((label, i) => ({ label, done: i < step, active: i === step }))
  const isEdit = Boolean(initialClient?._id)

  return (
    <>
      {!successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={handleRequestClose} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <UserPlus size={17} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Client' : 'Add New Client'}</h2>
                  <p className="text-xs text-gray-500">{STEP_SUBTITLES[step]}</p>
                </div>
              </div>
              <button onClick={handleRequestClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-100 flex justify-center">
              <Stepper steps={steps} />
            </div>

            {bannerError && (
              <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={15} className="shrink-0" />
                {bannerError}
              </div>
            )}

            <FormProvider {...form}>
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {step === 0 && <StepBasicInfo />}
                {step === 1 && <StepBillingDetails />}
                {step === 2 && <StepAssetsOrder clientId={clientId} />}
              </div>
            </FormProvider>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
              {step > 0 ? (
                <Button variant="outline" onClick={handleBack} disabled={saving} className="w-full sm:w-auto justify-center">Back</Button>
              ) : (
                <Button variant="outline" onClick={handleRequestClose} disabled={saving} className="w-full sm:w-auto justify-center">Cancel</Button>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button variant="outline" onClick={handleSaveDraft} loading={saving} disabled={saving} className="w-full sm:w-auto justify-center">Save as Draft</Button>
                <Button onClick={handleContinue} loading={saving} disabled={saving} className="w-full sm:w-auto justify-center">
                  {step < 2 ? 'Save & Continue' : 'Save Client'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ClientSuccessModal
        open={successOpen}
        clientName={savedName}
        onClose={() => { setSuccessOpen(false); onClose(); onSaved() }}
        onReturnToList={() => { setSuccessOpen(false); onClose(); onSaved() }}
      />
    </>
  )
}
