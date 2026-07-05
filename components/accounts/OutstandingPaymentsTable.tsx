'use client'

import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatCurrency } from '@/lib/utils'
import { PAYMENT_STATUS_COLOR } from '@/lib/constants'
import { isOrderOverdue } from './types'
import type { IClient, IOrder, PaymentStatus } from '@/types'

interface OutstandingPaymentsTableProps {
  orders: IOrder[]
  loading: boolean
  onSelect: (order: IOrder) => void
}

export function OutstandingPaymentsTable({ orders, loading, onSelect }: OutstandingPaymentsTableProps) {
  const due = orders
    .filter((o) => (o.balanceDue ?? 0) > 0)
    .sort((a, b) => {
      const overdueDiff = Number(isOrderOverdue(b)) - Number(isOrderOverdue(a))
      if (overdueDiff !== 0) return overdueDiff
      return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
    })

  if (!loading && due.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Due Payments</h2>
        </div>
        <EmptyState title="No outstanding balances" description="Every order is fully paid." />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Due Payments</h2>
        <span className="text-xs text-gray-400">{due.length} order(s) with balance due</span>
      </div>
      <DataTable
        loading={loading}
        data={due as unknown as Record<string, unknown>[]}
        keyField="_id"
        emptyMessage="No outstanding balances"
        onRowClick={(row) => onSelect(row as unknown as IOrder)}
        rowClassName={(row) => (isOrderOverdue(row as unknown as IOrder) ? 'bg-red-50/60 hover:bg-red-50' : undefined)}
        columns={[
          {
            key: 'orderNumber', header: 'Order No', render: (row) => {
              const overdue = isOrderOverdue(row as unknown as IOrder)
              return <span className={cn('text-sm font-bold', overdue ? 'text-red-600' : 'text-blue-600')}>{row.orderNumber as string}</span>
            },
          },
          {
            key: 'client', header: 'Client', render: (row) => {
              const client = row.client as IClient
              return <span className="text-sm text-gray-800">{client?.companyName || '—'}</span>
            },
          },
          {
            key: 'invoice', header: 'Invoice', render: (row) => {
              const order = row as unknown as IOrder
              return <span className="text-sm text-blue-600">{order.invoice?.invoiceNumber || '—'}</span>
            },
          },
          { key: 'totalAmount', header: 'Value', render: (row) => <span className="text-sm">{formatCurrency((row.totalAmount as number) ?? 0)}</span> },
          { key: 'advancePaid', header: 'Advance', render: (row) => <span className="text-sm text-green-600">{formatCurrency((row.advancePaid as number) ?? 0)}</span> },
          {
            key: 'balanceDue', header: 'Balance', render: (row) => {
              const overdue = isOrderOverdue(row as unknown as IOrder)
              return <span className={cn('text-sm font-semibold', overdue ? 'text-red-600' : 'text-gray-900')}>{formatCurrency((row.balanceDue as number) ?? 0)}</span>
            },
          },
          {
            key: 'status', header: 'Status', render: (row) => {
              const order = row as unknown as IOrder
              const overdue = isOrderOverdue(order)
              return (
                <div className="flex items-center gap-1.5">
                  <Badge
                    label={((order.paymentStatus as string) || 'pending').replace(/^\w/, (c) => c.toUpperCase())}
                    className={PAYMENT_STATUS_COLOR[order.paymentStatus as PaymentStatus]}
                  />
                  {overdue && <Badge label="Overdue" className="bg-red-100 text-red-700" />}
                </div>
              )
            },
          },
        ]}
      />
    </div>
  )
}
