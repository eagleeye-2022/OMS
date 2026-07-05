'use client'

import { Avatar } from '@/components/ui/Avatar'
import type { IAssignedTeam, IOrder, IUser } from '@/types'

const SLOT_LABEL: Record<keyof IAssignedTeam, string> = {
  salesExecutive: 'Sales Executive',
  creativeExecutive: 'Creative Executive',
  productionManager: 'Production Manager',
}

function nameOf(value: IUser | string | undefined): string | undefined {
  return value && typeof value !== 'string' ? value.name : undefined
}

interface ShippingAssignedTeamCardProps {
  order: IOrder
}

/** Read-only — Shipping doesn't add its own assignment slot, it just shows who's been involved across the order's lifecycle so far. */
export function ShippingAssignedTeamCard({ order }: ShippingAssignedTeamCardProps) {
  const slots = (Object.keys(SLOT_LABEL) as (keyof IAssignedTeam)[]).map((key) => ({
    key,
    label: SLOT_LABEL[key],
    name: nameOf(order.assignedTeam?.[key]),
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Assigned Team</h3>
      <div className="space-y-3">
        {slots.map(({ key, label, name }) => (
          <div key={key} className="flex items-center gap-3">
            <Avatar name={name || '?'} size="sm" />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-medium text-gray-900">{name || 'Unassigned'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
