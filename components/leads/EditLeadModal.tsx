'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Upload, Link as LinkIcon, Paperclip, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LEAD_PAYMENT_STATUS_LABEL, LEAD_PAYMENT_STATUS, type LeadPaymentStatus } from '@/lib/constants'
import { performUpload, ALLOWED_UPLOAD_ACCEPT, MAX_UPLOAD_FILE_SIZE_LABEL } from '@/lib/upload'
import type { ILead, IAssetFile, ILeadLink, IUser } from '@/types'

export type EditSection = 'all' | 'lead' | 'order' | 'description' | 'notes' | 'links' | 'files'

interface EditLeadModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  lead: ILead
  initialSection?: EditSection
}

export function EditLeadModal({ open, onClose, onSaved, lead, initialSection = 'all' }: EditLeadModalProps) {
  const [tab, setTab] = useState<'details' | 'notes' | 'links'>('details')
  const [users, setUsers] = useState<IUser[]>([])
  
  // Lead Details State
  const [name, setName] = useState(lead.name || '')
  const [companyName, setCompanyName] = useState(lead.companyName || '')
  const [phone, setPhone] = useState(lead.phone || '')
  const [countryCode, setCountryCode] = useState(lead.countryCode || '+91')
  const [email, setEmail] = useState(lead.email || '')
  const [source, setSource] = useState(lead.source || '')
  const [address, setAddress] = useState(lead.address || '')
  const [assignedTo, setAssignedTo] = useState<string>(
    typeof lead.assignedTo === 'object' && lead.assignedTo ? lead.assignedTo._id : (lead.assignedTo as string) || ''
  )

  // Order Details State
  const [productType, setProductType] = useState(lead.productType || '')
  const [quantity, setQuantity] = useState<number>(lead.quantity || 1)
  const [amount, setAmount] = useState<string>(lead.amount ? String(lead.amount) : '')
  const [closingDate, setClosingDate] = useState<string>(
    lead.closingDate ? new Date(lead.closingDate).toISOString().slice(0, 10) : ''
  )
  const [paymentStatus, setPaymentStatus] = useState<LeadPaymentStatus>(lead.paymentStatus || 'pending')
  const [specialRequirements, setSpecialRequirements] = useState(lead.specialRequirements || '')

  // Description & Notes State
  const [description, setDescription] = useState(lead.description || '')
  const [notes, setNotes] = useState(lead.notes || '')

  // Links & Attachments State
  const [links, setLinks] = useState<ILeadLink[]>(lead.links ? [...lead.links] : [])
  const [attachments, setAttachments] = useState<IAssetFile[]>(lead.attachments ? [...lead.attachments] : [])

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Sync state when lead or initialSection changes
  useEffect(() => {
    if (!open) return
    setName(lead.name || '')
    setCompanyName(lead.companyName || '')
    setPhone(lead.phone || '')
    setCountryCode(lead.countryCode || '+91')
    setEmail(lead.email || '')
    setSource(lead.source || '')
    setAddress(lead.address || '')
    setAssignedTo(typeof lead.assignedTo === 'object' && lead.assignedTo ? lead.assignedTo._id : (lead.assignedTo as string) || '')
    setProductType(lead.productType || '')
    setQuantity(lead.quantity || 1)
    setAmount(lead.amount ? String(lead.amount) : '')
    setClosingDate(lead.closingDate ? new Date(lead.closingDate).toISOString().slice(0, 10) : '')
    setPaymentStatus(lead.paymentStatus || 'pending')
    setSpecialRequirements(lead.specialRequirements || '')
    setDescription(lead.description || '')
    setNotes(lead.notes || '')
    setLinks(lead.links ? [...lead.links] : [])
    setAttachments(lead.attachments ? [...lead.attachments] : [])
    setError('')

    if (initialSection === 'notes' || initialSection === 'description') {
      setTab('notes')
    } else if (initialSection === 'links' || initialSection === 'files') {
      setTab('links')
    } else {
      setTab('details')
    }
  }, [open, lead, initialSection])

  // Fetch sales / active users for assignee picker
  useEffect(() => {
    if (!open) return
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setUsers(data.data)
        }
      })
      .catch(() => {})
  }, [open])

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('field', 'attachment')
        formData.append('leadId', lead._id || 'draft')
        const uploaded = await performUpload(formData)
        setAttachments((prev) => [...prev, uploaded])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddLink = () => {
    setLinks((prev) => [...prev, { label: '', url: '' }])
  }

  const handleUpdateLink = (index: number, field: 'label' | 'url', val: string) => {
    setLinks((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Lead name is required')
      setTab('details')
      return
    }
    if (!phone.trim()) {
      setError('Phone number is required')
      setTab('details')
      return
    }
    if (!productType.trim()) {
      setError('Product type is required')
      setTab('details')
      return
    }

    // Validate links if any
    const validLinks = links.filter((l) => l.label.trim() && l.url.trim())

    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim(),
          phone: phone.trim(),
          countryCode: countryCode.trim(),
          email: email.trim(),
          source: source.trim(),
          address: address.trim(),
          assignedTo: assignedTo || '',
          productType: productType.trim(),
          quantity: Number(quantity) || 1,
          amount: amount ? Number(amount) : undefined,
          closingDate: closingDate || undefined,
          paymentStatus,
          specialRequirements: specialRequirements.trim(),
          description: description.trim(),
          notes: notes.trim(),
          links: validLinks,
          attachments,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to update lead')
        return
      }

      onSaved()
      onClose()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Lead Details" size="xl">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Lead &amp; Order Details
          </button>
          <button
            type="button"
            onClick={() => setTab('notes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'notes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Description &amp; Notes
          </button>
          <button
            type="button"
            onClick={() => setTab('links')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'links'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Links &amp; Files ({links.length + attachments.length})
          </button>
        </div>

        {tab === 'details' && (
          <div className="space-y-6">
            {/* Section 1: Lead Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Lead Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Lead Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mohit Thakre"
                  required
                />
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Divine Tech"
                />
                <div className="flex gap-2">
                  <div className="w-24 shrink-0">
                    <Input
                      label="Country"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="+91"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Phone *"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9302702203"
                      required
                    />
                  </div>
                </div>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="m.thakre@eagleeye.io"
                />
                <Input
                  label="Lead Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Website, Referral"
                />
                <Select
                  label="Lead Assignee"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...users.map((u) => ({ value: u._id, label: `${u.name} (${u.role})` })),
                  ]}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Indore MP India"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Order Information */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Order Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Type *"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="e.g. Bags, Corporate T-shirts"
                  required
                />
                <Input
                  label="Quantity *"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="50"
                  required
                />
                <Input
                  label="Amount (₹)"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                />
                <Input
                  label="Expected Closing Date"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
                <Select
                  label="Payment Status"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as LeadPaymentStatus)}
                  options={Object.values(LEAD_PAYMENT_STATUS).map((s) => ({
                    value: s,
                    label: LEAD_PAYMENT_STATUS_LABEL[s],
                  }))}
                />
                <Input
                  label="Special Requirements"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="e.g. Yes, want a logo on the back"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4">
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add comprehensive description about this deal..."
            />
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Internal notes, links, or instructions..."
            />
          </div>
        )}

        {tab === 'links' && (
          <div className="space-y-6">
            {/* Links Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <LinkIcon size={15} className="text-indigo-600" /> Relevant Links
                </h3>
                <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />} onClick={handleAddLink}>
                  Add Link
                </Button>
              </div>
              {links.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No links added yet.</p>
              ) : (
                <div className="space-y-3">
                  {links.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="w-1/3">
                        <Input
                          placeholder="Link Label (e.g. Lead Page)"
                          value={link.label}
                          onChange={(e) => handleUpdateLink(idx, 'label', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="https://..."
                          value={link.url}
                          onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        className="text-gray-400 hover:text-red-600 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files / Attachments Management */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Paperclip size={15} className="text-teal-600" /> Files &amp; Attachments
                  </h3>
                  <p className="text-xs text-gray-400">Supported: Images, PDF, Excel, CSV (Max {MAX_UPLOAD_FILE_SIZE_LABEL})</p>
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300">
                    {uploading ? <Loader2 size={13} className="animate-spin text-blue-600" /> : <Upload size={13} />}
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept={ALLOWED_UPLOAD_ACCEPT}
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {attachments.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No files attached yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-medium text-gray-900 truncate">{file.originalName}</p>
                        <p className="text-gray-400 text-[11px]">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-gray-400 hover:text-red-600 p-1 shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
