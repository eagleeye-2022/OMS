import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { upsertInvoiceSchema } from '@/validations/order.schema'
import { stripSensitiveOrderFields, ORDER_CLIENT_DETAIL_FIELDS } from '@/lib/order-visibility'

const ACCOUNTS_ROLES = ['admin', 'accounts']

/**
 * Upsert/patch the order's single embedded invoice. Supports both the full
 * "Upload Invoice" form submission (first-time creation — requires
 * invoiceNumber + amount) and narrow follow-up updates like toggling
 * "Mark as Sent to Client" from the preview panel.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!ACCOUNTS_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only admin or accounts can manage invoices' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    await connectDB()

    const existing = await Order.findById(id)
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const parsed = upsertInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const isNew = !existing.invoice
    if (isNew && (!parsed.data.invoiceNumber || parsed.data.amount === undefined)) {
      return NextResponse.json(
        { success: false, error: 'invoiceNumber and amount are required to create an invoice' },
        { status: 400 }
      )
    }

    const current = existing.invoice ?? {
      invoiceNumber: parsed.data.invoiceNumber!,
      invoiceType: 'tax_invoice' as const,
      amount: parsed.data.amount!,
      isFinal: false,
      sentToClient: false,
    }

    const wasSent = Boolean(existing.invoice?.sentToClient)
    const { sentToClient, ...rest } = parsed.data
    Object.assign(current, rest)

    if (sentToClient !== undefined) {
      current.sentToClient = sentToClient
      // Only stamp a fresh sentAt on the actual false→true transition —
      // otherwise every subsequent PATCH (e.g. replacing the file while
      // sentToClient stays true) would keep bumping the "sent" timestamp
      // even though nothing was actually resent to the client.
      if (sentToClient && !wasSent) current.sentAt = new Date()
    }

    if (isNew || 'fileUrl' in body) {
      current.uploadedAt = new Date()
      current.uploadedBy = new Types.ObjectId(session.id)
    }

    existing.invoice = current
    existing.markModified('invoice')
    await existing.save()

    await ActivityLog.create({
      type: 'invoice_uploaded',
      description: isNew
        ? `Invoice ${current.invoiceNumber} created for order ${existing.orderNumber}`
        : `Invoice ${current.invoiceNumber} updated on order ${existing.orderNumber}`,
      order: id,
      user: session.id,
      userName: session.name,
    })

    const updated = await Order.findById(id)
      .populate('client', ORDER_CLIENT_DETAIL_FIELDS)
      .populate('createdBy', 'name')
      .populate('invoice.uploadedBy', 'name')
      .lean()

    return NextResponse.json({ success: true, data: stripSensitiveOrderFields(updated, session.role) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
