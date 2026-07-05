import type { IOrder } from '@/types'

export const COMPANY_PROFILE = {
  name: 'The Untitled Store',
  addressLine1: 'Plot 12, Industrial Estate,',
  addressLine2: 'Lower Parel, Mumbai, 400013',
  gstNumber: '27AABCT8844D1Z5',
  bankName: 'HDFC Bank, Parel Branch',
  ifsc: 'HDFC0001234',
  accountNumber: '50200012345678',
}

export function isOrderOverdue(order: IOrder): boolean {
  return (order.balanceDue ?? 0) > 0 && new Date(order.deliveryDate) < new Date() && order.status !== 'delivered' && order.status !== 'cancelled'
}

export function hasInvoiceFile(order: IOrder): boolean {
  return Boolean(order.invoice?.fileUrl)
}

export function invoiceStatusLabel(order: IOrder): string {
  const status = order.paymentStatus
  if (status === 'paid') return 'PAID'
  if (status === 'partial') return 'ADVANCE RECEIVED'
  if (isOrderOverdue(order)) return 'OVERDUE'
  return 'UNPAID'
}

export function invoiceStatusColor(order: IOrder): string {
  const status = order.paymentStatus
  if (status === 'paid') return 'bg-green-100 text-green-700'
  if (status === 'partial') return 'bg-teal-100 text-teal-700'
  if (isOrderOverdue(order)) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

export function totalGst(amount: number, cgstPercent?: number, sgstPercent?: number): number {
  const pct = (cgstPercent ?? 0) + (sgstPercent ?? 0)
  return Math.round(amount * (pct / 100))
}
