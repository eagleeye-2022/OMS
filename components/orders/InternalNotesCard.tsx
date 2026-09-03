'use client'

import { useRef, useState } from 'react'
import { Paperclip, Send, Loader2, X, ExternalLink, FileText, FileSpreadsheet } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ALLOWED_UPLOAD_ACCEPT, validateUploadFile, performUpload, parseJsonResponse, type UploadResult } from '@/lib/upload'
import type { IOrder } from '@/types'
import type { NoteType } from '@/lib/constants'

interface InternalNotesCardProps {
  order: IOrder
  onUpdated: () => void
  title?: string
  noteType?: NoteType
}

export function InternalNotesCard({ order, onUpdated, title = 'Internal Notes', noteType = 'general' }: InternalNotesCardProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachment, setAttachment] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // order.notes already comes pre-filtered to the domains the viewer's role
  // may see (server-side, via filterNotesForRole) — but admin can see all 5
  // domains, so without this filter every module's notes card (Creative
  // Remarks, Production Remarks, Shipping Notes, this Accounts card) would
  // show every domain's notes mixed together for admin instead of just its
  // own.
  const domainNotes = order.notes.filter((note) => (note.noteType || 'general') === noteType)

  const handleFileChange = async (file: File | undefined) => {
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
      formData.append('field', 'noteAttachment')
      const result = await performUpload(formData)
      setAttachment(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if (!text.trim() && !attachment) return
    setSaving(true)
    setError('')
    try {
      const payload: Record<string, unknown> = { noteType }
      if (text.trim()) payload.text = text.trim()
      if (attachment) {
        payload.attachment = {
          url: attachment.url,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
        }
      }
      const res = await fetch(`/api/orders/${order._id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await parseJsonResponse<{ success: boolean; error?: string }>(res, 'Failed to add note')
      if (data.success) {
        setText('')
        setAttachment(null)
        onUpdated()
      } else {
        setError(data.error || 'Failed to add note')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {domainNotes.length === 0 ? (
          <p className="text-sm text-gray-400">No notes yet. Add one below.</p>
        ) : (
          domainNotes.map((note, i) => {
            const att = note.attachment
            const isSpreadsheet = att && (
              att.mimeType?.includes('sheet') ||
              att.mimeType?.includes('excel') ||
              att.mimeType?.includes('csv') ||
              /\.(xlsx|xls|csv)$/i.test(att.originalName)
            )
            return (
              <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800">{note.authorName}</span>
                  <span className="text-xs text-gray-400">{formatDate(note.at)}</span>
                </div>
                {note.text && <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>}
                {att && (
                  <div className="mt-2">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-md text-xs font-medium text-amber-900 hover:bg-amber-100/50 transition-colors"
                    >
                      {isSpreadsheet ? (
                        <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" />
                      ) : (
                        <FileText size={13} className="text-amber-700 shrink-0" />
                      )}
                      <span className="truncate max-w-[200px]">{att.originalName}</span>
                      <ExternalLink size={11} className="text-amber-600 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {attachment && (
        <div className="flex items-center justify-between gap-2 mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
          <div className="flex items-center gap-1.5 truncate">
            <Paperclip size={13} className="shrink-0 text-blue-600" />
            <span className="font-medium truncate">{attachment.originalName}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="text-blue-500 hover:text-blue-700 p-0.5 rounded"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_UPLOAD_ACCEPT}
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />

      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || saving}
          className="text-gray-400 hover:text-gray-600 shrink-0 disabled:opacity-40"
          title="Attach document or file"
        >
          {uploading ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <Paperclip size={15} />}
        </button>
        <input
          className="flex-1 text-sm outline-none placeholder-gray-400"
          placeholder="Add a note or attach file..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={saving || uploading || (!text.trim() && !attachment)}
          className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  )
}
