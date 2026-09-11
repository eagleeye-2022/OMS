'use client'

import { useState } from 'react'
import { Phone, Mail, Calendar as CalendarIcon, StickyNote, ArrowLeftRight, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LEAD_MANUAL_ACTIVITY_TYPES, LEAD_ACTIVITY_TYPE_LABEL, type LeadActivityType } from '@/lib/constants'

interface AddActivityModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  leadId: string
}

const ACTIVITY_ICONS: Record<LeadActivityType, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <CalendarIcon size={14} />,
  note: <StickyNote size={14} />,
  status_changed: <ArrowLeftRight size={14} />,
  file: <Paperclip size={14} />,
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function AddActivityModal({ open, onClose, onSaved, leadId }: AddActivityModalProps) {
  const [type, setType] = useState<LeadActivityType>('call')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState(nowTimeStr())
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, date, time, description }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to save activity')
        return
      }
      setTitle('')
      setDescription('')
      onSaved()
      onClose()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Activity" size="lg">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-500 -mt-2 mb-4">Log a new activity related to this deal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Activity Type *"
            value={type}
            onChange={(e) => setType(e.target.value as LeadActivityType)}
            options={LEAD_MANUAL_ACTIVITY_TYPES.map((t) => ({ value: t, label: LEAD_ACTIVITY_TYPE_LABEL[t] }))}
          />
          <Input label="Title *" value={title} onChange={(e) => { setTitle(e.target.value); setError('') }} placeholder="e.g. Call with Arjun Reddy" />
          <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time *" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="sm:col-span-2">
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Add details about this activity..." />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} icon={ACTIVITY_ICONS[type]}>Save Activity</Button>
        </div>
      </form>
    </Modal>
  )
}
