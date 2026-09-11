'use client'

import { useState, useEffect, useCallback, use, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, User, Package, FileText, StickyNote, Link as LinkIcon, Paperclip,
  Phone, Mail, Calendar as CalendarIcon, ArrowLeftRight, Plus, LayoutGrid,
  History, CreditCard, Pencil,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Timeline } from '@/components/ui/Timeline'
import { LeadStatusDropdown } from '@/components/leads/LeadStatusDropdown'
import { AddActivityModal } from '@/components/leads/AddActivityModal'
import { EditLeadModal, type EditSection } from '@/components/leads/EditLeadModal'
import { formatCurrency, formatDate, formatLeadCode, cn } from '@/lib/utils'
import {
  LEAD_PAYMENT_STATUS_LABEL,
  LEAD_STATUS_LABEL, LEAD_STATUS_COLOR,
  type LeadStatus, type LeadActivityType,
} from '@/lib/constants'
import type { ILead, IActivityLog, IUser, IClient, IOrder } from '@/types'

function getLogIcon(typeStr: string, titleStr?: string): React.ReactNode {
  const t = (typeStr || '').toLowerCase().trim()
  const title = (titleStr || '').toLowerCase().trim()

  if (t === 'call' || title.includes('call')) return <Phone size={13} />
  if (t === 'meeting' || title.includes('meet')) return <CalendarIcon size={13} />
  if (t === 'email' || title.includes('email') || title.includes('mail')) return <Mail size={13} />
  if (t === 'note' || title.includes('note')) return <StickyNote size={13} />
  if (t === 'status_changed' || title.includes('status')) return <ArrowLeftRight size={13} />
  if (t === 'file' || title.includes('file') || title.includes('attachment')) return <Paperclip size={13} />

  return <FileText size={13} />
}

function getLogBgColor(typeStr: string, titleStr?: string): string {
  const t = (typeStr || '').toLowerCase().trim()
  const title = (titleStr || '').toLowerCase().trim()

  if (t === 'call' || title.includes('call')) return 'bg-emerald-600'
  if (t === 'meeting' || title.includes('meet')) return 'bg-rose-500'
  if (t === 'email' || title.includes('email') || title.includes('mail')) return 'bg-blue-600'
  if (t === 'note' || title.includes('note')) return 'bg-amber-500'
  if (t === 'status_changed' || title.includes('status')) return 'bg-indigo-600'
  if (t === 'file' || title.includes('file') || title.includes('attachment')) return 'bg-teal-600'

  return 'bg-blue-600'
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const fmt = (x: Date) => x.toDateString()
  if (fmt(d) === fmt(today)) return `TODAY, ${formatDate(d).toUpperCase()}`
  if (fmt(d) === fmt(yesterday)) return `YESTERDAY, ${formatDate(d).toUpperCase()}`
  return formatDate(d).toUpperCase()
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [lead, setLead] = useState<ILead | null>(null)
  const [logs, setLogs] = useState<IActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'timeline'>('overview')
  const [activityFilter, setActivityFilter] = useState<'all' | LeadActivityType>('all')
  const [addActivityOpen, setAddActivityOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editSection, setEditSection] = useState<EditSection>('all')

  const handleOpenEdit = (sec: EditSection = 'all') => {
    setEditSection(sec)
    setEditOpen(true)
  }

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const res = await fetch(`/api/leads/${id}`)
      const data = await res.json()
      if (data.success) {
        setLead(data.data.lead)
        setLogs(data.data.logs)
      }
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (status: LeadStatus) => {
    const res = await fetch(`/api/leads/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) load(true)
  }

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.activityAt || a.createdAt).getTime()
      const timeB = new Date(b.activityAt || b.createdAt).getTime()
      return timeB - timeA
    })
  }, [logs])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const log of logs) counts[log.type] = (counts[log.type] || 0) + 1
    return counts
  }, [logs])

  const filteredLogs = useMemo(
    () => (activityFilter === 'all' ? sortedLogs : sortedLogs.filter((l) => l.type === activityFilter)),
    [sortedLogs, activityFilter]
  )

  const groupedLogs = useMemo(() => {
    const groups: { label: string; items: IActivityLog[] }[] = []
    for (const log of filteredLogs) {
      const at = log.activityAt || log.createdAt
      const label = dayLabel(at)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(log)
      else groups.push({ label, items: [log] })
    }
    return groups
  }, [filteredLogs])

  if (loading || !lead) {
    return <div className="p-6 text-sm text-gray-400">Loading...</div>
  }

  const assignee = typeof lead.assignedTo === 'object' ? (lead.assignedTo as IUser) : null
  const convertedClient = typeof lead.convertedClient === 'object' ? (lead.convertedClient as IClient) : null
  const convertedOrder = typeof lead.convertedOrder === 'object' ? (lead.convertedOrder as IOrder) : null

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
        <ArrowLeft size={14} /> Back to Leads
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Avatar name={lead.companyName || lead.name} size="lg" />
            <div>
              <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2.5 py-0.5 rounded-md font-medium mb-1.5">
                Deal #{formatLeadCode(lead.leadCode)}
              </p>
              <h1 className="text-lg font-bold text-gray-900">
                {lead.companyName ? `${lead.companyName} — ${lead.productType}` : lead.name}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Lead: <span className="font-medium text-gray-700">{lead.name}</span> · Created on {formatDate(lead.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('all')}>
              Edit Lead
            </Button>
            <LeadStatusDropdown status={lead.status} onChange={handleStatusChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <CreditCard size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <p className="text-sm font-bold text-gray-900">{lead.amount ? formatCurrency(lead.amount) : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <Package size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Quantity</p>
              <p className="text-sm font-bold text-gray-900">{lead.quantity} Pieces</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <CalendarIcon size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Expected Closing Date</p>
              <p className="text-sm font-bold text-gray-900">{lead.closingDate ? formatDate(lead.closingDate) : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <User size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Lead Assignee</p>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                {assignee ? (
                  <>
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold inline-flex items-center justify-center">
                      {assignee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                    {assignee.name}
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>
        </div>

        {(convertedClient || convertedOrder) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3 text-xs">
            {convertedClient && (
              <Link href={`/clients/${convertedClient._id}`} className="text-blue-600 hover:underline">
                View Client {convertedClient.clientCode} →
              </Link>
            )}
            {convertedOrder && (
              <Link href={`/orders/${convertedOrder._id}`} className="text-blue-600 hover:underline">
                View Order {convertedOrder.orderNumber} →
              </Link>
            )}
          </div>
        )}
      </div>

      <Tabs
        tabs={[{ key: 'overview', label: 'Overview' }, { key: 'timeline', label: 'Timeline' }]}
        active={tab}
        onChange={(k) => setTab(k as 'overview' | 'timeline')}
      />

      {tab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-blue-600" />
                  <p className="text-sm font-semibold text-gray-900">Lead Details</p>
                </div>
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('lead')}>
                  Edit
                </Button>
              </div>
              <dl className="space-y-2.5 text-sm">
                <Row label="Lead Name" value={lead.name} />
                <Row label="Company" value={lead.companyName || '—'} />
                <Row label="Phone" value={`${lead.countryCode} ${lead.phone}`} />
                <Row label="Email" value={lead.email || '—'} />
                <Row label="Lead Source" value={lead.source || '—'} />
                <Row label="Address" value={lead.address || '—'} />
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-indigo-600" />
                  <p className="text-sm font-semibold text-gray-900">Order Details</p>
                </div>
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('order')}>
                  Edit
                </Button>
              </div>
              <dl className="space-y-2.5 text-sm">
                <Row label="Product Type" value={lead.productType} />
                <Row label="Quantity" value={`${lead.quantity} Pieces`} />
                <Row label="Amount" value={lead.amount ? formatCurrency(lead.amount) : '—'} />
                <Row label="Expected Closing Date" value={lead.closingDate ? formatDate(lead.closingDate) : '—'} />
                <Row label="Payment Status" value={LEAD_PAYMENT_STATUS_LABEL[lead.paymentStatus]} />
                <Row label="Special Requirements" value={lead.specialRequirements || '—'} />
              </dl>
            </div>
          </div>

          <Card
            icon={<FileText size={15} className="text-purple-600" />}
            title="Description"
            action={
              <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('description')}>
                Edit
              </Button>
            }
          >
            {lead.description ? (
              <p className="text-sm text-gray-700 whitespace-pre-line">{lead.description}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No description provided. Click Edit to add details.</p>
            )}
          </Card>

          <Card
            icon={<StickyNote size={15} className="text-amber-600" />}
            title="Notes"
            action={
              <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('notes')}>
                Edit
              </Button>
            }
          >
            {lead.notes ? (
              <p className="text-sm text-gray-700 bg-amber-50 rounded-lg p-3 whitespace-pre-line">{lead.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes added. Click Edit to add notes.</p>
            )}
          </Card>

          <Card
            icon={<LinkIcon size={15} className="text-indigo-600" />}
            title="Links"
            action={
              <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('links')}>
                Edit Links
              </Button>
            }
          >
            {lead.links && lead.links.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {lead.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                    <p className="text-sm font-medium text-gray-800 truncate">{l.label}</p>
                    <p className="text-xs text-blue-600 truncate">{l.url}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No links added. Click Edit Links to add.</p>
            )}
          </Card>

          <Card
            icon={<Paperclip size={15} className="text-teal-600" />}
            title={`Files (${lead.attachments?.length || 0})`}
            action={
              <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => handleOpenEdit('files')}>
                Manage Files
              </Button>
            }
          >
            {lead.attachments && lead.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {lead.attachments.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.originalName}</p>
                    <p className="text-xs text-gray-400">{formatDate(f.uploadedAt)}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No files attached. Click Manage Files to upload.</p>
            )}
          </Card>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-5 border-b border-gray-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <History size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Timeline</h2>
                <p className="text-xs text-gray-500">Track all key activities and updates related to this deal.</p>
              </div>
            </div>
            <Button
              size="md"
              icon={<Plus size={15} />}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-4 py-2 text-sm font-medium rounded-lg"
              onClick={() => setAddActivityOpen(true)}
            >
              Add Activity
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-8">
            <div className="sm:w-56 shrink-0 space-y-1">
              <FilterRow icon={<LayoutGrid size={15} />} label="All Activities" count={logs.length} active={activityFilter === 'all'} onClick={() => setActivityFilter('all')} />
              <FilterRow icon={<Phone size={15} className="text-emerald-500" />} label="Calls" count={typeCounts['call'] || 0} active={activityFilter === 'call'} onClick={() => setActivityFilter('call')} />
              <FilterRow icon={<Mail size={15} className="text-blue-500" />} label="Emails" count={typeCounts['email'] || 0} active={activityFilter === 'email'} onClick={() => setActivityFilter('email')} />
              <FilterRow icon={<CalendarIcon size={15} className="text-rose-500" />} label="Meetings" count={typeCounts['meeting'] || 0} active={activityFilter === 'meeting'} onClick={() => setActivityFilter('meeting')} />
              <FilterRow icon={<StickyNote size={15} className="text-amber-500" />} label="Notes" count={typeCounts['note'] || 0} active={activityFilter === 'note'} onClick={() => setActivityFilter('note')} />
              <FilterRow icon={<ArrowLeftRight size={15} className="text-indigo-500" />} label="Status Changes" count={typeCounts['status_changed'] || 0} active={activityFilter === 'status_changed'} onClick={() => setActivityFilter('status_changed')} />
              <FilterRow icon={<Paperclip size={15} className="text-teal-500" />} label="Files" count={typeCounts['file'] || 0} active={activityFilter === 'file'} onClick={() => setActivityFilter('file')} />
            </div>

            <div className="flex-1 min-w-0">
              {groupedLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No activities recorded yet.</p>
              ) : (
                groupedLogs.map((group) => (
                  <div key={group.label} className="mb-6">
                    <p className="text-xs font-bold text-gray-900 tracking-wider uppercase mb-4">
                      {group.label}
                    </p>
                    <Timeline
                      items={group.items.map((log) => {
                        const userName = (typeof log.user === 'object' && log.user && 'name' in log.user ? (log.user as { name: string }).name : log.userName) || 'User'
                        const formattedTime = new Date(log.activityAt || log.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })

                        let badge: React.ReactNode = null
                        if (log.type === 'status_changed') {
                          const toStatus = (log.metadata?.to as LeadStatus) || (Object.keys(LEAD_STATUS_LABEL).find((s) => log.description.toLowerCase().includes(LEAD_STATUS_LABEL[s as LeadStatus].toLowerCase())) as LeadStatus)
                          if (toStatus && LEAD_STATUS_LABEL[toStatus]) {
                            badge = (
                              <span className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium', LEAD_STATUS_COLOR[toStatus])}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {LEAD_STATUS_LABEL[toStatus]}
                              </span>
                            )
                          }
                        }

                        const attachment = (log.type === 'file' || log.metadata?.fileName) ? {
                          name: (log.metadata?.fileName as string) || (log.metadata?.originalName as string) || log.title || 'Customer_Design.png',
                          size: (log.metadata?.fileSize as string) || (log.metadata?.size ? `${(Number(log.metadata.size) / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB'),
                          url: log.metadata?.url as string,
                        } : undefined

                        return {
                          icon: getLogIcon(log.type, log.title),
                          color: getLogBgColor(log.type, log.title),
                          title: log.title || (log.type === 'status_changed' ? 'Status Changed' : log.description),
                          sub: log.type === 'status_changed' ? log.description : (log.title ? log.description : undefined),
                          time: formattedTime,
                          author: `By ${userName}`,
                          badge,
                          attachment,
                        }
                      })}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <AddActivityModal
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
        onSaved={() => load(true)}
        leadId={id}
      />

      <EditLeadModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => load(true)}
        lead={lead}
        initialSection={editSection}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-800 font-medium text-right">{value}</dd>
    </div>
  )
}

function Card({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function FilterRow({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
        active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
      )}
    >
      <span className="flex items-center gap-2.5">{icon} {label}</span>
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', active ? 'bg-blue-100 text-blue-800' : 'text-gray-400')}>{count}</span>
    </button>
  )
}
