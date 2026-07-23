import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { upsertInvoiceSchema } from '@/validations/order.schema'
import { stripSensitiveOrderFields, ORDER_CLIENT_DETAIL_FIELDS } from '@/lib/order-visibility'

const ACCOUNTS_ROLES = ['admin', 'accounting']

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

    // No invoice may exist while money is still owed — checked twice,
    // deliberately, because the order's own balanceDue is pre-tax while the
    // invoice adds GST on top of it. Only re-checked when this request could
    // actually change the invoice's money fields (creation, or an edit that
    // touches amount/cgstPercent/sgstPercent) — a narrow follow-up like
    // toggling "Mark as Sent to Client" on an invoice that already exists
    // must not re-trigger this and block an otherwise-unrelated action.
    const touchesMoney = isNew || 'amount' in rest || 'cgstPercent' in rest || 'sgstPercent' in rest
    if (touchesMoney) {
      // 1) The order itself isn't fully paid yet (pre-tax) — the plain,
      // common case: nothing has been invoiced or paid at all yet.
      if (existing.balanceDue > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot generate an invoice — ₹${existing.balanceDue.toLocaleString('en-IN')} is still due on this order. The order must be fully paid before an invoice can be created.`,
          },
          { status: 409 }
        )
      }
      // 2) The order shows fully paid pre-tax, but the invoice's own GST
      // (default 9%+9% — see InvoiceUploadModal) would push its grand total
      // above what's actually been received, leaving a real balance due on
      // the invoice itself even though the order looks settled. This is the
      // exact gap that let an invoice with a visible "Balance Due" through
      // before this fix.
      const gstAmount = Math.round((current.amount * ((current.cgstPercent ?? 0) + (current.sgstPercent ?? 0))) / 100)
      const invoiceGrandTotal = current.amount + gstAmount
      if (invoiceGrandTotal > existing.advancePaid) {
        const shortfall = invoiceGrandTotal - existing.advancePaid
        return NextResponse.json(
          {
            success: false,
            error: `Cannot generate this invoice — with GST included the total is ₹${invoiceGrandTotal.toLocaleString('en-IN')}, but only ₹${existing.advancePaid.toLocaleString('en-IN')} has been received (₹${shortfall.toLocaleString('en-IN')} short). Collect the remaining amount, including tax, before invoicing.`,
          },
          { status: 409 }
        )
      }
    }

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
