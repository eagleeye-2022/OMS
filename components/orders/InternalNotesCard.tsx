'use client'

import { useState } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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
  const [error, setError] = useState('')

  // order.notes already comes pre-filtered to the domains the viewer's role
  // may see (server-side, via filterNotesForRole) — but admin can see all 5
  // domains, so without this filter every module's notes card (Creative
  // Remarks, Production Remarks, Shipping Notes, this Accounts card) would
  // show every domain's notes mixed together for admin instead of just its
  // own.
  const domainNotes = order.notes.filter((note) => (note.noteType || 'general') === noteType)

  const handleSend = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order._id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), noteType }),
      })
      const data = await res.json()
      if (data.success) {
        setText('')
        onUpdated()
      } else {
        setError(data.error || 'Failed to add note')
      }
    } catch {
      setError('Network error')
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
          domainNotes.map((note, i) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-800">{note.authorName}</span>
                <span className="text-xs text-gray-400">{formatDate(note.at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
            </div>
          ))
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
        <button type="button" className="text-gray-400 hover:text-gray-600 shrink-0" title="Attach (use Assets & Documents)">
          <Paperclip size={15} />
        </button>
        <input
          className="flex-1 text-sm outline-none placeholder-gray-400"
          placeholder="Add a note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={saving || !text.trim()}
          className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}
