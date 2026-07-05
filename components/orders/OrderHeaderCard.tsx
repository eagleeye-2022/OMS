'use client'

import { Pencil, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR } from '@/lib/constants'
import type { IClient, IOrder, OrderStatus } from '@/types'

interface OrderHeaderCardProps {
  order: IOrder
  canEdit: boolean
  onEdit: () => void
}

export function OrderHeaderCard({ order, canEdit, onEdit }: OrderHeaderCardProps) {
  const client = order.client as IClient

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 print:border-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">{order.orderNumber}</h2>
            <Badge label={ORDER_STATUS_LABEL[order.status as OrderStatus]} className={ORDER_STATUS_COLOR[order.status as OrderStatus]} />
            <Badge label={PRIORITY_LABEL[order.priority]} className={PRIORITY_COLOR[order.priority]} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{client?.companyName}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {canEdit && (
            <Button variant="outline" size="sm" icon={<Pencil size={14} />} onClick={onEdit}>Edit Details</Button>
          )}
          <Button variant="outline" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>Print Manifest</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar name={client?.companyName || '?'} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{client?.companyName}</p>
            <p className="text-xs text-gray-500">{client?.contactPersonName} {client?.phone ? `| ${client.phone}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 ml-auto text-xs">
          <div><p className="text-gray-400">Created On</p><p className="text-gray-800 font-medium">{formatDate(order.createdAt)}</p></div>
          <div><p className="text-gray-400">Delivery Date</p><p className="text-gray-800 font-medium">{formatDate(order.deliveryDate)}</p></div>
        </div>
      </div>
    </div>
  )
}
