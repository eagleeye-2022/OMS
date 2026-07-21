import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { paymentReminderSchema } from '@/validations/order.schema'

const ACCOUNTS_ROLES = ['admin', 'accounting']

/**
 * Logs an overdue-payment reminder. There is no email/WhatsApp dispatch
 * infrastructure in this codebase (no SMTP/messaging provider config
 * anywhere), so this is a simulated send: it records who was notified,
 * through which channels, and any escalation note — matching how
 * Notification/ActivityLog entries elsewhere in the app are internal
 * records rather than real external dispatches.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!ACCOUNTS_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only admin or accounts can send payment reminders' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    await connectDB()

    const existing = await Order.findById(id)
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (existing.balanceDue <= 0) {
      return NextResponse.json({ success: false, error: 'This order has no outstanding balance' }, { status: 400 })
    }

    const parsed = paymentReminderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { channels, escalationNote } = parsed.data
    const channelLabels = [
      channels.email && 'email',
      channels.whatsapp && 'WhatsApp',
      channels.internal && 'internal team',
    ].filter(Boolean)

    if (channelLabels.length === 0) {
      return NextResponse.json({ success: false, error: 'Select at least one reminder channel' }, { status: 400 })
    }

    const loggedAt = new Date()
    await ActivityLog.create({
      type: 'payment_reminder_sent',
      description: `Overdue payment reminder for ${existing.orderNumber} sent via ${channelLabels.join(', ')}${escalationNote ? ` — ${escalationNote}` : ''}`,
      order: id,
      client: existing.client,
      user: session.id,
      userName: session.name,
    })

    return NextResponse.json({
      success: true,
      data: { loggedAt: loggedAt.toISOString(), loggedBy: session.name, channels: channelLabels },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
