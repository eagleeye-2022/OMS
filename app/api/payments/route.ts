import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Payment from '@/models/Payment'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import Notification from '@/models/Notification'
import { paymentSchema } from '@/validations/payment.schema'
import { CAN_VIEW_FINANCE } from '@/lib/order-visibility'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!CAN_VIEW_FINANCE.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order')
    const clientId = searchParams.get('client')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const query: Record<string, string> = {}
    if (orderId) query.order = orderId
    if (clientId) query.client = clientId

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order', 'orderNumber totalAmount balanceDue')
        .populate('client', 'companyName')
        .populate('recordedBy', 'name')
        .lean(),
      Payment.countDocuments(query),
    ])

    return NextResponse.json({ success: true, data: payments, total })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!CAN_VIEW_FINANCE.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = paymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()

    // Verify the order exists and belongs to the stated client
    const order = await Order.findById(parsed.data.order)
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    if (order.client.toString() !== parsed.data.client) {
      return NextResponse.json(
        { success: false, error: 'Order does not belong to the specified client' },
        { status: 400 }
      )
    }
    if (order.balanceDue <= 0) {
      return NextResponse.json(
        { success: false, error: 'This order has no outstanding balance' },
        { status: 400 }
      )
    }
    if (parsed.data.amount > order.balanceDue) {
      return NextResponse.json(
        { success: false, error: `Payment amount cannot exceed the balance due (₹${order.balanceDue.toLocaleString('en-IN')})` },
        { status: 400 }
      )
    }

    // Sorted by receiptNumber itself (not createdAt) — bulk-seeded payments
    // can share the same millisecond timestamp, which made createdAt-based
    // "last" lookups pick an arbitrary tied record and mint a colliding
    // number. receiptNumber sorts correctly since it's always zero-padded
    // to a fixed width.
    const lastPayment = await Payment.findOne().sort({ receiptNumber: -1 }).select('receiptNumber').lean()
    let nextReceiptNum = 1
    if (lastPayment?.receiptNumber) {
      const match = lastPayment.receiptNumber.match(/\d+/)
      if (match) nextReceiptNum = parseInt(match[0]) + 1
    }
    const receiptNumber = `RCP-${String(nextReceiptNum).padStart(4, '0')}`

    const payment = await Payment.create({ ...parsed.data, receiptNumber, recordedBy: session.id })

    const newAdvance = order.advancePaid + parsed.data.amount
    const newBalance = Math.max(0, order.totalAmount - newAdvance)
    const newPaymentStatus = newBalance <= 0 ? 'paid' : newAdvance > 0 ? 'partial' : 'pending'

    await Promise.all([
      Order.findByIdAndUpdate(parsed.data.order, {
        advancePaid: newAdvance,
        balanceDue: newBalance,
        paymentStatus: newPaymentStatus,
      }),
      ActivityLog.create({
        type: 'payment_recorded',
        description: `Payment of ₹${parsed.data.amount.toLocaleString('en-IN')} recorded for ${order.orderNumber}`,
        order: order._id,
        client: parsed.data.client,
        user: session.id,
        userName: session.name,
      }),
    ])

    if (newBalance <= 0) {
      await Notification.create({
        type: 'payment_pending',
        title: `Payment complete · ${order.orderNumber}`,
        message: `Full payment received for order ${order.orderNumber}`,
        order: order._id,
        priority: 'low',
      })
    }

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
