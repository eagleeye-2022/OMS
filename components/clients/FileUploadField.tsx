'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALLOWED_UPLOAD_ACCEPT, validateUploadFile } from '@/lib/upload'
import type { ClientAssetFormValue } from './types'

interface FileUploadFieldProps {
  label: string
  clientId?: string
  field: string
  value?: ClientAssetFormValue
  onChange: (value: ClientAssetFormValue | undefined) => void
}

export function FileUploadField({ label, clientId, field, value, onChange }: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!clientId) {
      setError('Save this client first (Continue from Step 1) before uploading files')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const validationError = validateUploadFile(file)
    if (validationError) {
      setError(validationError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', clientId)
      formData.append('field', field)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        onChange(data.data)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Network error during upload')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {value ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
          <a href={value.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline truncate min-w-0">
            {value.mimeType.startsWith('image/') ? (
              <Image src={value.url} alt={value.originalName} width={20} height={20} unoptimized className="rounded object-cover shrink-0 h-5 w-5" />
            ) : (
              <FileText size={15} className="shrink-0" />
            )}
            <span className="truncate">{value.originalName}</span>
          </a>
          <button type="button" onClick={() => onChange(undefined)} className="text-gray-400 hover:text-red-600 shrink-0">
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-400',
            'hover:border-gray-400 transition-colors disabled:opacity-60'
          )}
        >
          Upload
          {uploading ? <Loader2 size={15} className="animate-spin text-gray-400" /> : <Upload size={15} className="text-gray-400" />}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
