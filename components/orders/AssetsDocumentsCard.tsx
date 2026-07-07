'use client'

import { useRef, useState } from 'react'
import { FileText, ExternalLink, Plus, Upload, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ALLOWED_UPLOAD_ACCEPT, validateUploadFile } from '@/lib/upload'
import type { IOrder } from '@/types'

interface AssetsDocumentsCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
  title?: string
}

export function AssetsDocumentsCard({ order, canEdit, onUpdated, title = 'Assets & Documents' }: AssetsDocumentsCardProps) {
  const [addingLink, setAddingLink] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addAsset = async (payload: { label: string; url: string; kind: 'drive_link' | 'file'; mimeType?: string; size?: number }) => {
    const res = await fetch(`/api/orders/${order._id}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Failed to add asset')
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addAsset({ label, url, kind: 'drive_link' })
      setLabel('')
      setUrl('')
      setAddingLink(false)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return
    const validationError = validateUploadFile(file)
    if (validationError) {
      setError(validationError)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('orderId', order._id)
      formData.append('field', 'asset')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Upload failed')
      await addAsset({ label: file.name, url: data.data.url, kind: 'file', mimeType: data.data.mimeType, size: data.data.size })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-gray-400 hover:text-gray-600" title="Upload file">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            </button>
            <button onClick={() => setAddingLink((v) => !v)} className="text-gray-400 hover:text-gray-600" title="Add link">
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" className="hidden" accept={ALLOWED_UPLOAD_ACCEPT} onChange={(e) => handleFileUpload(e.target.files?.[0])} />

      {addingLink && (
        <form onSubmit={handleAddLink} className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <Input placeholder="Label (e.g. Artwork Reference)" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Input placeholder="https://drive.google.com/..." value={url} onChange={(e) => setUrl(e.target.value)} required />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingLink(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={saving}>Add</Button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <div className="space-y-2">
        {order.assets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets added yet.</p>
        ) : (
          order.assets.map((asset, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={15} className="text-gray-400 shrink-0" />
                <span className="text-gray-800 truncate">{asset.label}</span>
              </div>
              <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs shrink-0">
                {asset.kind === 'drive_link' ? 'Google Drive' : 'View'} <ExternalLink size={11} />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
