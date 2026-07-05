'use client'

import { Stepper } from '@/components/ui/Stepper'
import type { OrderStatus } from '@/types'

const STEP_LABELS = ['Created', 'Design Apprv.', 'Production', 'Quality Check', 'Dispatched']

// Maps the 11-value granular OrderStatus into the design's 5 coarse steps.
// 'delayed' loses its underlying stage in the current status model (it's a
// standalone terminal-ish value, not combined with in_production/etc.), so
// it falls back to the Production step as the most common case.
const STATUS_TO_STEP: Record<OrderStatus, number> = {
  pending: 0,
  design_review: 1,
  design_approved: 1,
  in_production: 2,
  quality_check: 3,
  shipping_ready: 4,
  dispatched: 4,
  in_transit: 4,
  delivered: 4,
  delayed: 2,
  cancelled: 0,
}

interface OrderProgressStepperProps {
  status: OrderStatus
}

export function OrderProgressStepper({ status }: OrderProgressStepperProps) {
  if (status === 'cancelled') {
    return <p className="text-sm text-red-600 font-medium">This order has been cancelled.</p>
  }

  const currentStepIdx = STATUS_TO_STEP[status] ?? 0
  const isComplete = status === 'delivered'
  const steps = STEP_LABELS.map((label, i) => ({
    label,
    done: i < currentStepIdx || (isComplete && i <= currentStepIdx),
    active: i === currentStepIdx && !isComplete,
  }))

  return (
    <div className="overflow-x-auto pb-1">
      <Stepper steps={steps} />
    </div>
  )
}
