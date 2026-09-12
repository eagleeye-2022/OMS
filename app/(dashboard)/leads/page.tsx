'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { Select } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge'
import { DateRangeModal, type DateRange } from '@/components/leads/DateRangeModal'
import { formatCurrency, formatLeadCode } from '@/lib/utils'
import { LEAD_STATUS_VALUES, LEAD_STATUS_LABEL } from '@/lib/constants'
import type { ILead, LeadStats, IUser } from '@/types'

const PAGE_SIZE = 8

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null
  const up = value >= 0
  return (
    <Badge
      label={`${up ? '↑' : '↓'} ${Math.abs(value)}%`}
      className={up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
    />
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<ILead[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [range, setRange] = useState<DateRange>({ start: null, end: null })
  const [rangeModalOpen, setRangeModalOpen] = useState(false)

  const latestKeyRef = useRef('')

  const loadList = useCallback(async (q: string, st: string, pg: number, r: DateRange) => {
    const key = `${q}::${st}::${pg}::${r.start}::${r.end}`
    latestKeyRef.current = key
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: q, status: st, page: String(pg), limit: String(PAGE_SIZE) })
      if (r.start) params.set('startDate', r.start)
      if (r.end) params.set('endDate', r.end)
      const res = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      if (latestKeyRef.current !== key) return
      if (data.success) {
        setLeads(data.data)
        setTotal(data.total)
        setStats(data.stats)
      }
    } catch (err) {
      console.error('[LeadsPage] loadList failed:', err)
    } finally {
      if (latestKeyRef.current === key) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadList(search, status, page, range), 250)
    return () => clearTimeout(t)
  }, [search, status, page, range, loadList])

  useEffect(() => { setPage(1) }, [search, status, range])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns = [
    {
      key: 'leadCode',
      header: 'Lead #',
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {formatLeadCode(row.leadCode)}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name / Company',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.companyName && <p className="text-xs text-gray-500">{row.companyName}</p>}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone },
    { key: 'email', header: 'Email', render: (row) => row.email || '—' },
    { key: 'quantity', header: 'Qty', render: (row) => row.quantity },
    { key: 'amount', header: 'Amount', render: (row) => (row.amount ? formatCurrency(row.amount) : '—') },
    { key: 'status', header: 'Status', render: (row) => <LeadStatusBadge status={row.status} /> },
    {
      key: 'assignedTo',
      header: 'Lead Assignee',
      render: (row) => (typeof row.assignedTo === 'object' ? (row.assignedTo as IUser).name : '—'),
    },
  ] satisfies import('@/components/ui/DataTable').Column<ILead>[]

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">Manage enquiries and convert them into orders.</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => router.push('/leads/new')}>Add Lead</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.total ?? '—'} badge={<DeltaBadge value={stats?.totalDelta ?? null} />} sub="vs last month" />
        <StatCard label="New Enquiries" value={stats?.newEnquiries ?? '—'} badge={<DeltaBadge value={stats?.newEnquiriesDelta ?? null} />} sub="vs last month" />
        <StatCard label="Lost Leads" value={stats?.lost ?? '—'} badge={<DeltaBadge value={stats?.lostDelta ?? null} />} sub="vs last month" />
        <StatCard label="Converted" value={stats?.converted ?? '—'} badge={<DeltaBadge value={stats?.convertedDelta ?? null} />} sub="vs last month" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          className="flex-1 min-w-[240px]"
          placeholder="Search by name, company, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[{ value: '', label: 'All Status' }, ...LEAD_STATUS_VALUES.map((s) => ({ value: s, label: LEAD_STATUS_LABEL[s] }))]}
        />
        <Button variant="outline" icon={<Filter size={14} />} onClick={() => setRangeModalOpen(true)}>Filters</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <DataTable
          columns={columns as unknown as import('@/components/ui/DataTable').Column<Record<string, unknown>>[]}
          data={leads as unknown as Record<string, unknown>[]}
          loading={loading}
          keyField="_id"
          emptyMessage="No leads found"
          onRowClick={(row) => router.push(`/leads/${(row as unknown as ILead)._id}`)}
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {leads.length} of {total} leads
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-600 px-2">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <DateRangeModal
        open={rangeModalOpen}
        onClose={() => setRangeModalOpen(false)}
        onApply={setRange}
        initialRange={range}
      />
    </div>
  )
}
