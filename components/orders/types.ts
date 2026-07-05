import type { IOrder, Priority } from '@/types'

export interface OrderFormValues {
  _id?: string
  client: string
  category: string
  productType: string
  quantity: string
  sizeBreakdown: string
  deliveryDate: string
  priority: Priority
  totalAmount: string
  advancePaid: string
}

export function emptyOrderFormValues(): OrderFormValues {
  return {
    client: '',
    category: '',
    productType: '',
    quantity: '',
    sizeBreakdown: '',
    deliveryDate: '',
    priority: 'normal',
    totalAmount: '',
    advancePaid: '',
  }
}

function toDateInputValue(date?: string): string {
  if (!date) return ''
  return date.slice(0, 10)
}

export function mapOrderToFormValues(order: IOrder): OrderFormValues {
  return {
    _id: order._id,
    client: typeof order.client === 'string' ? order.client : order.client._id,
    category: order.category,
    productType: order.productType,
    quantity: String(order.quantity),
    sizeBreakdown: order.sizeBreakdown || '',
    deliveryDate: toDateInputValue(order.deliveryDate),
    priority: order.priority || 'normal',
    totalAmount: order.totalAmount != null ? String(order.totalAmount) : '',
    advancePaid: order.advancePaid != null ? String(order.advancePaid) : '',
  }
}

/** Payload for POST /api/orders (create) — full field set. */
export function buildCreateOrderPayload(values: OrderFormValues) {
  return {
    client: values.client,
    category: values.category,
    productType: values.productType,
    quantity: Number(values.quantity),
    sizeBreakdown: values.sizeBreakdown || undefined,
    deliveryDate: values.deliveryDate,
    priority: values.priority,
    totalAmount: Number(values.totalAmount),
    advancePaid: values.advancePaid ? Number(values.advancePaid) : 0,
  }
}

/** Payload for the PUT "core details" intent (edit) — client/finance excluded by design. */
export function buildEditOrderPayload(values: OrderFormValues) {
  return {
    category: values.category,
    productType: values.productType,
    quantity: Number(values.quantity),
    sizeBreakdown: values.sizeBreakdown || undefined,
    deliveryDate: values.deliveryDate,
    priority: values.priority,
  }
}
