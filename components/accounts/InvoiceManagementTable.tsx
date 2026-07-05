'use client'

import { FileText, Upload, Eye } from 'lucide-react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { hasInvoiceFile, invoiceStatusColor, invoiceStatusLabel } from './types'
import type { IClient, IOrder } from '@/types'

interface InvoiceManagementTableProps {
  orders: IOrder[]
  loading: boolean
  onSelect: (order: IOrder) => void
  onUpload: (order: IOrder) => void
  onPreview: (order: IOrder) => void
}

export function InvoiceManagementTable({ orders, loading, onSelect, onUpload, onPreview }: InvoiceManagementTableProps) {
  const rows = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (!loading && rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Invoices</h2>
        </div>
        <EmptyState title="No invoices yet" description="Invoices will appear here once orders are created." />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">All Invoices</h2>
        <span className="text-xs text-gray-400">Showing {rows.length} order(s)</span>
      </div>
      <DataTable
        loading={loading}
        data={rows as unknown as Record<string, unknown>[]}
        keyField="_id"
        emptyMessage="No invoices yet"
        columns={[
          {
            key: 'invoiceNumber', header: 'Invoice', render: (row) => {
              const order = row as unknown as IOrder
              return (
                <button onClick={() => onSelect(order)} className="text-sm font-semibold text-blue-600 hover:underline">
                  {order.invoice?.invoiceNumber || '—'}
                </button>
              )
            },
          },
          {
            key: 'orderNumber', header: 'Order', render: (row) => {
              const order = row as unknown as IOrder
              return (
                <button onClick={() => onSelect(order)} className="text-sm font-semibold text-blue-600 hover:underline">
                  {order.orderNumber}
                </button>
              )
            },
          },
          {
            key: 'client', header: 'Client', render: (row) => {
              const client = row.client as IClient
              return <span className="text-sm text-gray-800">{client?.companyName || '—'}</span>
            },
          },
          {
            key: 'invoiceDate', header: 'Date', render: (row) => {
              const order = row as unknown as IOrder
              return <span className="text-sm text-gray-500">{order.invoice?.invoiceDate ? formatDate(order.invoice.invoiceDate) : formatDate(order.createdAt)}</span>
            },
          },
          {
            key: 'amount', header: 'Amount', render: (row) => {
              const order = row as unknown as IOrder
              return <span className="text-sm">{formatCurrency(order.invoice?.amount ?? order.totalAmount ?? 0)}</span>
            },
          },
          {
            key: 'file', header: 'File', render: (row) => {
              const order = row as unknown as IOrder
              return hasInvoiceFile(order) ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600"><FileText size={13} /> PDF</span>
              ) : (
                <Badge label="Pending Upload" className="bg-amber-100 text-amber-700" />
              )
            },
          },
          {
            key: 'status', header: 'Status', render: (row) => {
              const order = row as unknown as IOrder
              return <Badge label={invoiceStatusLabel(order)} className={invoiceStatusColor(order)} />
            },
          },
          {
            key: 'actions', header: 'Actions', render: (row) => {
              const order = row as unknown as IOrder
              return hasInvoiceFile(order) ? (
                <button onClick={() => onPreview(order)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  <Eye size={13} /> View Preview
                </button>
              ) : (
                <button onClick={() => onUpload(order)} className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">
                  <Upload size={13} /> Upload
                </button>
              )
            },
          },
        ]}
      />
    </div>
  )
}
