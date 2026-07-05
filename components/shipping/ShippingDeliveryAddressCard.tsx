'use client'

import { MapPin } from 'lucide-react'
import type { IClient, IOrder } from '@/types'

interface ShippingDeliveryAddressCardProps {
  order: IOrder
}

export function ShippingDeliveryAddressCard({ order }: ShippingDeliveryAddressCardProps) {
  const client = order.client as IClient
  if (!client || typeof client === 'string') return null

  const address = client.sameAsBilling ? client.billingAddress : client.shippingAddress
  const addressLine = [address?.landmark, address?.city, address?.state, address?.pinCode]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
        <MapPin size={14} /> Delivery Address
      </h3>
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-gray-900">{client.companyName}</p>
        {client.contactPersonName && <p className="text-gray-600">{client.contactPersonName}</p>}
        <p className="text-gray-600">{addressLine || 'No address on file'}</p>
        {(client.phone || client.alternatePhone) && (
          <p className="text-gray-500">{client.phone || client.alternatePhone}</p>
        )}
      </div>
    </div>
  )
}
