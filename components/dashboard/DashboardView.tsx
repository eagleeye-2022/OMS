'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable } from '@/components/ui/DataTable'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate, formatRelativeTime, getDaysUntilDeadline, cn } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/constants'
import type { OrderStatus } from '@/lib/constants'

interface DashboardData {
  stats: {
    totalOrders: number
    totalOrdersDelta: number
    activeOrders: number
    activeOrdersDelta: number
    pendingApproval: number
    pendingApprovalDelta: number
    delayed: number
    delayedDelta: number
    revenue: number
    revenueDelta: number
    outstanding: number
    outstandingDelta: number
  }
  pipeline: Record<string, number>
  stageCounts: Record<string, number>
  monthlySeries: Array<{ label: string; orders: number; revenue: number }>
  recentOrders: Array<{
    _id: string
    orderNumber: string
    client: { companyName: string }
    category: string
    quantity: number
    status: string
    deliveryDate: string
    totalAmount: number
    paymentStatus: string
  }>
  deliveryDeadlines: Array<{
    _id: string
    orderNumber: string
    client: { companyName: string }
    deliveryDate: string
    status: string
  }>
  recentActivity: Array<{
    _id: string
    type: string
    description: string
    userName: string
    createdAt: string
    order?: { orderNumber: string }
  }>
  alerts: {
    overdue: Array<{ _id: string; orderNumber: string; deliveryDate: string }>
    pendingDesign: Array<{ _id: string; orderNumber: string; client: { companyName: string } }>
  }
}

const ACTIVITY_COLORS: Record<string, string> = {
  order_created: 'bg-blue-500',
  order_dispatched: 'bg-cyan-500',
  payment_recorded: 'bg-green-500',
  design_approved: 'bg-purple-500',
  order_delivered: 'bg-green-600',
  client_created: 'bg-blue-400',
  status_changed: 'bg-gray-400',
}

const STAGE_LABELS: Record<string, string> = {
  design_review: 'Design Review',
  design_approved: 'Design Approved',
  in_production: 'In Production',
  quality_check: 'Quality Check',
}

/** Renders a KPI's (current - previous period) delta as a small pill — hidden when there's no real change. */
function DeltaBadge({ delta, currency }: { delta: number; currency?: boolean }) {
  if (delta === 0) return null
  const positive = delta > 0
  const magnitude = currency ? formatCurrency(Math.abs(delta)) : Math.abs(delta)
  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded font-medium',
      positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    )}>
      {positive ? '+' : '-'}{magnitude}
    </span>
  )
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartMetric, setChartMetric] = useState<'orders' | 'revenue'>('orders')

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  if (!data) return <div className="p-6 text-red-500">Failed to load dashboard data.</div>

  const { stats, pipeline, stageCounts, monthlySeries, recentOrders, deliveryDeadlines, recentActivity, alerts } = data
  const pipelineTotal = Object.values(pipeline).reduce((a, b) => a + b, 0)
  const chartMax = Math.max(1, ...monthlySeries.map((m) => m[chartMetric]))

  const deadlineItems = deliveryDeadlines.map((o) => ({
    ...o,
    daysLeft: getDaysUntilDeadline(o.deliveryDate),
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Good morning. Here&apos;s what&apos;s happening today.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Orders" value={stats.totalOrders} sub="This month vs last month"
          badge={<DeltaBadge delta={stats.totalOrdersDelta} />} />
        <StatCard label="Active Orders" value={stats.activeOrders} sub="Currently in workflow" accent="text-blue-600"
          badge={<DeltaBadge delta={stats.activeOrdersDelta} />} />
        <StatCard label="Pending Approval" value={stats.pendingApproval} sub="Awaiting action" accent="text-amber-600"
          badge={<DeltaBadge delta={stats.pendingApprovalDelta} />} />
        <StatCard label="Delayed" value={stats.delayed} sub="Currently delayed" accent="text-red-600"
          badge={<DeltaBadge delta={stats.delayedDelta} />} />
        <StatCard label="Revenue" value={formatCurrency(stats.revenue)} sub="Collected this month" accent="text-green-600"
          badge={<DeltaBadge delta={stats.revenueDelta} currency />} />
        <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} sub={`${stats.delayed + stats.pendingApproval} orders pending`} accent="text-purple-600"
          badge={<DeltaBadge delta={stats.outstandingDelta} currency />} />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Monthly Overview — real rolling 12-month order/revenue data */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Monthly Overview</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartMetric('orders')}
                className={cn('text-xs px-3 py-1 rounded', chartMetric === 'orders' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100')}
              >
                Orders
              </button>
              <button
                onClick={() => setChartMetric('revenue')}
                className={cn('text-xs px-3 py-1 rounded', chartMetric === 'revenue' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100')}
              >
                Revenue
              </button>
            </div>
          </div>
          <div className="h-44 flex items-end gap-2">
            {monthlySeries.map((m, i) => {
              const value = m[chartMetric]
              const pct = value > 0 ? Math.max(4, Math.round((value / chartMax) * 100)) : 0
              return (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="bg-blue-100 rounded-t hover:bg-blue-200 transition-colors"
                    style={{ height: `${pct}%` }}
                    title={`${m.label}: ${chartMetric === 'revenue' ? formatCurrency(value) : `${value} orders`}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            {monthlySeries.map((m, i) => <span key={i}>{m.label}</span>)}
          </div>
        </div>

        {/* Pipeline Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline Breakdown</h2>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {[
                  { key: 'creative', color: '#8B5CF6', pct: pipelineTotal ? pipeline.creative / pipelineTotal : 0 },
                  { key: 'production', color: '#F59E0B', pct: pipelineTotal ? pipeline.production / pipelineTotal : 0 },
                  { key: 'qc', color: '#10B981', pct: pipelineTotal ? pipeline.qc / pipelineTotal : 0 },
                  { key: 'shipping', color: '#3B82F6', pct: pipelineTotal ? pipeline.shipping / pipelineTotal : 0 },
                  { key: 'pending', color: '#E5E7EB', pct: pipelineTotal ? pipeline.pending / pipelineTotal : 0 },
                ].reduce<{ els: React.ReactNode[], offset: number }>((acc, seg) => {
                  const dash = seg.pct * 251.2
                  const gap = 251.2 - dash
                  acc.els.push(
                    <circle key={seg.key} cx="50" cy="50" r="40" fill="none" stroke={seg.color} strokeWidth="16"
                      strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-acc.offset} />
                  )
                  acc.offset += dash
                  return acc
                }, { els: [], offset: 0 }).els}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{pipelineTotal}</span>
                <span className="text-xs text-gray-400">ACTIVE</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              {[
                { label: 'Creative', key: 'creative', color: 'bg-purple-500' },
                { label: 'Production', key: 'production', color: 'bg-amber-500' },
                { label: 'QC', key: 'qc', color: 'bg-green-500' },
                { label: 'Shipping', key: 'shipping', color: 'bg-blue-500' },
                { label: 'Pending', key: 'pending', color: 'bg-gray-300' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{pipeline[key] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Monitor */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Stage Monitor</h3>
            <div className="space-y-2">
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const count = stageCounts[key] || 0
                const pct = pipelineTotal ? Math.round((count / pipelineTotal) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="text-gray-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Alerts & Flags */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Alerts & Flags</h2>
          <div className="space-y-3">
            {alerts.overdue.map((o) => (
              <div key={o._id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">Overdue Order</p>
                  <p className="text-xs text-red-500">{o.orderNumber} is {Math.abs(getDaysUntilDeadline(o.deliveryDate))} days past its primary deadline.</p>
                </div>
              </div>
            ))}
            {alerts.pendingDesign.map((o) => (
              <div key={o._id} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-blue-600 text-xs">✏</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700">Pending Design</p>
                  <p className="text-xs text-blue-500">
                    Client &apos;{(o.client as { companyName: string })?.companyName}&apos; hasn&apos;t approved the design concepts.
                  </p>
                </div>
              </div>
            ))}
            {alerts.overdue.length === 0 && alerts.pendingDesign.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No active alerts</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((log) => (
              <div key={log._id} className="flex gap-3">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', ACTIVITY_COLORS[log.type] || 'bg-gray-400')} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{log.description}</p>
                  <p className="text-xs text-gray-400">{formatRelativeTime(log.createdAt)} · {log.userName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Delivery Deadlines</h2>
            {stats.delayed > 0 && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-semibold">
                {stats.delayed} OVERDUE
              </span>
            )}
          </div>
          <div className="space-y-3">
            {deadlineItems.map((o) => (
              <div key={o._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">{(o.client as { companyName: string })?.companyName}</p>
                </div>
                <span className={cn(
                  'text-xs font-medium',
                  o.daysLeft < 0 ? 'text-red-600' : o.daysLeft <= 2 ? 'text-amber-600' : 'text-green-600'
                )}>
                  {o.daysLeft < 0 ? 'Delayed' : o.daysLeft === 0 ? 'Today' : `Due in ${o.daysLeft} days`}
                </span>
              </div>
            ))}
            {deadlineItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No upcoming deadlines</p>
            )}
          </div>
          <button className="mt-3 w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1">
            View Schedule
          </button>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Active Orders</h2>
          <a href="/orders" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All</a>
        </div>
        <DataTable
          data={recentOrders as unknown as Record<string, unknown>[]}
          keyField="_id"
          columns={[
            {
              key: 'orderNumber', header: 'Order No.', render: (row) => (
                <a href={`/orders/${row._id as string}`} className="font-semibold text-gray-900 hover:text-blue-600 text-xs">
                  {row.orderNumber as string}
                </a>
              )
            },
            {
              key: 'client', header: 'Client', render: (row) => {
                const client = row.client as { companyName?: string }
                return (
                  <div className="flex items-center gap-2">
                    <Avatar name={client?.companyName || '?'} size="sm" />
                    <span className="text-xs text-gray-700">{client?.companyName}</span>
                  </div>
                )
              }
            },
            { key: 'category', header: 'Product', render: (row) => <span className="text-xs">{row.category as string}</span> },
            { key: 'quantity', header: 'Qty', render: (row) => <span className="text-xs">{(row.quantity as number).toLocaleString()}</span> },
            {
              key: 'status', header: 'Stage', render: (row) => (
                <Badge label={ORDER_STATUS_LABEL[row.status as OrderStatus] || String(row.status)} className={ORDER_STATUS_COLOR[row.status as OrderStatus]} />
              )
            },
            { key: 'deliveryDate', header: 'Delivery', render: (row) => <span className="text-xs text-gray-500">{formatDate(row.deliveryDate as string)}</span> },
            { key: 'totalAmount', header: 'Value (INR)', render: (row) => <span className="text-xs font-medium">{formatCurrency(row.totalAmount as number)}</span> },
            {
              key: 'progress', header: 'Progress', render: (row) => {
                const stages = ['pending','design_review','design_approved','in_production','quality_check','shipping_ready','dispatched','delivered']
                const idx = stages.indexOf(row.status as string)
                const pct = idx >= 0 ? Math.round((idx / (stages.length - 1)) * 100) : 0
                const color = row.status === 'delayed' ? 'bg-red-500' : 'bg-gray-800'
                return (
                  <div className="w-16 h-1 bg-gray-100 rounded-full">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                )
              }
            },
          ]}
        />
      </div>

      {/* Floating action button */}
      <a
        href="/orders?new=1"
        className="fixed bottom-6 right-6 w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors"
      >
        <Plus size={20} />
      </a>
    </div>
  )
}
