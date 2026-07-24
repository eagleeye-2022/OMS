import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import { applyDirectStatusUpdate } from '@/lib/order-status'
import { stripSensitiveOrderFields, ORDER_CLIENT_DETAIL_FIELDS } from '@/lib/order-visibility'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    await connectDB()

    const existing = await Order.findById(id)
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    const result = await applyDirectStatusUpdate(existing, session, body)
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    const updated = await Order.findById(id)
      .populate('client', ORDER_CLIENT_DETAIL_FIELDS)
      .populate('createdBy', 'name')
      .lean()

    return NextResponse.json({ success: true, data: stripSensitiveOrderFields(updated, session.role, session.email) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
