'use client'

import { formatDate } from '@/lib/utils'
import type { IClient, IOrder, IUser } from '@/types'

/** "Client & Order Info" section — reused by every module's order-detail view. */
export function OrderClientInfoCard({ order }: { order: IOrder }) {
  const client = order.client as IClient
  const createdBy = order.createdBy as IUser | string | undefined
  const createdByName = createdBy && typeof createdBy === 'object' ? createdBy.name : undefined

  const rows: [string, string][] = [
    ['Client', client?.companyName || '—'],
    ['Client Code', client?.clientCode || '—'],
    ['Order ID', order.orderNumber],
    ['Order Date', formatDate(order.createdAt)],
    ['Created By', createdByName || '—'],
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Client &amp; Order Info</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-start gap-4 text-sm sm:block">
            <span className="text-gray-500 sm:text-xs sm:text-gray-400">{label}</span>
            <span className="text-gray-900 font-medium text-right sm:text-left sm:block sm:mt-0.5">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
