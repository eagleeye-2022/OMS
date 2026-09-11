'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Package, FileText, Paperclip, Upload, Trash2, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { performUpload, validateUploadFile, ALLOWED_UPLOAD_ACCEPT } from '@/lib/upload'
import { formatFileSize } from '@/lib/utils'
import {
  LEAD_SOURCE, LEAD_STATUS_VALUES, LEAD_STATUS_LABEL,
  LEAD_PAYMENT_STATUS, LEAD_PAYMENT_STATUS_LABEL,
  PREFERRED_CONTACT_TIME, PRODUCT_CATEGORIES,
} from '@/lib/constants'
import type { IUser, IAssetFile, ILeadLink } from '@/types'

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+971']

interface FormState {
  name: string
  source: string
  companyName: string
  status: string
  countryCode: string
  phone: string
  email: string
  address: string
  productType: string
  closingDate: string
  quantity: string
  paymentStatus: string
  amount: string
  specialRequirements: string
  description: string
  notes: string
  preferredContactTime: string
  assignedTo: string
}

const INITIAL: FormState = {
  name: '', source: '', companyName: '', status: 'new_enquiries',
  countryCode: '+91', phone: '', email: '', address: '',
  productType: '', closingDate: '', quantity: '', paymentStatus: 'pending', amount: '',
  specialRequirements: '', description: '', notes: '', preferredContactTime: '',
  assignedTo: '',
}

export default function CreateLeadPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [users, setUsers] = useState<IUser[]>([])
  const [attachments, setAttachments] = useState<IAssetFile[]>([])
  const [links, setLinks] = useState<ILeadLink[]>([])
  const [linkInput, setLinkInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((d) => { if (d.success) setUsers(d.data) }).catch(() => {})
  }, [])

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        const validationError = validateUploadFile(file)
        if (validationError) { setError(validationError); continue }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('field', 'attachment')
        formData.append('leadId', 'draft')
        const result = await performUpload(formData)
        setAttachments((prev) => [...prev, result])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAddLink = () => {
    if (!linkInput.trim()) return
    try {
      new URL(linkInput)
    } catch {
      setError('Enter a valid URL (including https://)')
      return
    }
    setLinks((prev) => [...prev, { label: linkInput, url: linkInput }])
    setLinkInput('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) return setError('Lead name is required')
    if (!form.phone.trim()) return setError('Phone number is required')
    if (!form.productType) return setError('Product type is required')
    if (!form.quantity) return setError('Quantity is required')

    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: form.quantity,
          amount: form.amount || undefined,
          closingDate: form.closingDate || undefined,
          attachments,
          links,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to create lead')
        return
      }
      router.push(`/leads/${data.data._id}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2">
          <ArrowLeft size={14} /> Back to Leads
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Create Lead</h1>
        <p className="text-sm text-gray-500">Add a new lead and start tracking potential business opportunities.</p>
      </div>

      {/* Basic Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><User size={16} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Basic Details</p>
            <p className="text-xs text-gray-500">Enter the main information about the lead.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Lead Name *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter lead name" />
          <Select label="Lead Source" value={form.source} onChange={(e) => set('source', e.target.value)} options={[{ value: '', label: 'Select lead source' }, ...LEAD_SOURCE.map((s) => ({ value: s, label: s }))]} />
          <Input label="Company Name" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Enter company name" />
          <Select label="Lead Status *" value={form.status} onChange={(e) => set('status', e.target.value)} options={LEAD_STATUS_VALUES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s] }))} />
          <div className="flex gap-2">
            <Select className="w-24" value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)} options={COUNTRY_CODES.map((c) => ({ value: c, label: c }))} />
            <Input className="flex-1" label="Phone Number *" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Enter phone number" />
          </div>
          <Input label="Email Address" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Enter email address" />
          <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Enter address" />
        </div>
      </div>

      {/* Lead Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Package size={16} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Lead Details</p>
            <p className="text-xs text-gray-500">Enter details about the customer&apos;s requirements.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Product Type *" value={form.productType} onChange={(e) => set('productType', e.target.value)} options={[{ value: '', label: 'Select product type' }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))]} />
          <Input label="Expected Closing Date" type="date" value={form.closingDate} onChange={(e) => set('closingDate', e.target.value)} />
          <Input label="Quantity *" type="number" min={1} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="Enter quantity" />
          <Select label="Payment Status" value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)} options={Object.values(LEAD_PAYMENT_STATUS).map((s) => ({ value: s, label: LEAD_PAYMENT_STATUS_LABEL[s] }))} />
          <Input label="Amount" type="number" min={0} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="Enter amount" />
          <Input label="Special Requirements" value={form.specialRequirements} onChange={(e) => set('specialRequirements', e.target.value)} placeholder="Enter special requirements (Optional)" />
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><FileText size={16} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Additional Information</p>
            <p className="text-xs text-gray-500">Add any additional details about the lead.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Textarea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Enter a short description about the lead..." />
          <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Add internal notes for your team..." />
          <Select label="Preferred Contact Time" value={form.preferredContactTime} onChange={(e) => set('preferredContactTime', e.target.value)} options={PREFERRED_CONTACT_TIME.map((t) => ({ value: t, label: t }))} />
          <Select label="Lead Assignee" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} options={[{ value: '', label: 'Select lead assignee' }, ...users.map((u) => ({ value: u._id, label: u.name }))]} />
        </div>
      </div>

      {/* Files and Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600"><Paperclip size={16} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Files and Links</p>
            <p className="text-xs text-gray-500">Attach relevant files or add useful links related to this lead.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Upload Files</p>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg py-8 text-center cursor-pointer hover:border-blue-400"
            >
              <Upload size={22} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Drag and drop files here, or <span className="text-blue-600 font-medium">click to browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Supported formats: PNG, JPG, PDF, DOC, DOCX (Max 4MB each)</p>
              <input ref={fileInputRef} type="file" multiple hidden accept={ALLOWED_UPLOAD_ACCEPT} onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
            <div className="mt-2 space-y-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2">
                  <div>
                    <p className="text-gray-800">{a.originalName}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(a.size)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-green-500" />
                    <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Add Links</p>
            <div className="flex gap-2">
              <Input className="flex-1" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="Enter URL (e.g. website, design reference, etc.)" />
              <Button variant="secondary" onClick={handleAddLink}>Add Link</Button>
            </div>
            <div className="mt-2 space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <LinkIcon size={14} className="text-blue-500 shrink-0" />
                    <p className="text-gray-800 truncate">{l.url}</p>
                  </div>
                  <button onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={() => router.push('/leads')}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>Save Lead</Button>
      </div>
    </div>
  )
}
