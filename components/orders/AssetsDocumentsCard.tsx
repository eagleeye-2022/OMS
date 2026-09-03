'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { FileText, ExternalLink, Plus, Upload, Loader2, Cloud, FileSpreadsheet } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ALLOWED_UPLOAD_ACCEPT, validateUploadFile, performUpload, parseJsonResponse } from '@/lib/upload'
import type { IOrder, IClient } from '@/types'

interface AssetsDocumentsCardProps {
  order: IOrder
  canEdit: boolean
  onUpdated: () => void
  title?: string
}

interface DisplayAsset {
  key: string
  label: string
  url: string
  kind: 'drive_link' | 'file'
  mimeType?: string
  // Overrides the trailing action badge (default: 'Google Drive' for
  // drive_link, 'View'/'Open' for file) — only set for client-provided link
  // items below, since they aren't necessarily Google Drive links and
  // showing that label for a Website URL or Dropbox link would be wrong.
  actionLabel?: string
}

const CLIENT_ASSET_LABELS: Record<keyof IClient['assets'], string> = {
  companyLogo: 'Company Logo',
  brandGuidelines: 'Brand Guidelines',
  artworkReferences: 'Artwork References',
  previousDesigns: 'Previous Designs',
}

const CLIENT_LINK_LABELS: Record<keyof IClient['sharedLinks'], string> = {
  googleDriveFolder: 'Google Drive Folder',
  dropboxFolder: 'Dropbox Folder',
  websiteUrl: 'Website URL',
  socialMedia: 'Social Media',
}

// Documents/links the client provided at onboarding (StepAssetsOrder.tsx)
// live on the Client record, not the Order — merge them in read-only ahead
// of the order's own added assets so this card shows everything received
// from the client, not just what's been attached to this specific order.
function getClientProvidedAssets(order: IOrder): DisplayAsset[] {
  const client = typeof order.client === 'object' ? (order.client as IClient) : undefined
  if (!client) return []

  const assetEntries = Object.entries(client.assets || {}) as [keyof IClient['assets'], IClient['assets'][keyof IClient['assets']]][]
  const fileItems: DisplayAsset[] = assetEntries
    .filter(([, file]) => !!file)
    .map(([key, file]) => ({ key: `client-asset-${key}`, label: CLIENT_ASSET_LABELS[key], url: file!.url, kind: 'file', mimeType: file!.mimeType }))

  const linkEntries = Object.entries(client.sharedLinks || {}) as [keyof IClient['sharedLinks'], string | undefined][]
  const linkItems: DisplayAsset[] = linkEntries
    .filter(([, url]) => !!url)
    .map(([key, url]) => ({ key: `client-link-${key}`, label: CLIENT_LINK_LABELS[key], url: url!, kind: 'drive_link', actionLabel: 'Open Link' }))

  return [...fileItems, ...linkItems]
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
    let res: Response
    try {
      res = await fetch(`/api/orders/${order._id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new Error('Network error — check your internet connection and try again')
    }
    const data = await parseJsonResponse<{ success: boolean; data?: unknown; error?: string }>(res, 'Failed to add asset')
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
      const result = await performUpload(formData)
      await addAsset({ label: file.name, url: result.url, kind: 'file', mimeType: result.mimeType, size: result.size })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const displayAssets: DisplayAsset[] = [
    ...getClientProvidedAssets(order),
    ...order.assets.map((asset, i) => ({ key: `order-${i}`, label: asset.label, url: asset.url, kind: asset.kind, mimeType: asset.mimeType })),
  ]

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
        {displayAssets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets added yet.</p>
        ) : (
          displayAssets.map((asset) => {
            const isImage = asset.kind === 'file' && !!asset.mimeType?.startsWith('image/')
            const isSpreadsheet = asset.kind === 'file' && (
              !!asset.mimeType?.includes('sheet') ||
              !!asset.mimeType?.includes('excel') ||
              !!asset.mimeType?.includes('csv') ||
              /\.(xlsx|xls|csv)$/i.test(asset.label)
            )
            return (
              <a
                key={asset.key}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-2 text-sm rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isImage ? (
                    // Blob URLs aren't in next.config's image domains, so use
                    // `unoptimized` (same approach as clients/FileUploadField)
                    // to render the raw file directly as a thumbnail.
                    <Image
                      src={asset.url}
                      alt={asset.label}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-md object-cover border border-gray-200 shrink-0"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                      {asset.kind === 'drive_link'
                        ? <Cloud size={16} className="text-gray-400" />
                        : isSpreadsheet
                        ? <FileSpreadsheet size={16} className="text-emerald-600" />
                        : <FileText size={16} className="text-gray-400" />}
                    </span>
                  )}
                  <span className="text-gray-800 truncate group-hover:underline">{asset.label}</span>
                </div>
                <span className="flex items-center gap-1 text-blue-600 text-xs shrink-0">
                  {asset.actionLabel ?? (asset.kind === 'drive_link' ? 'Google Drive' : isImage ? 'View' : 'Open')} <ExternalLink size={11} />
                </span>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
