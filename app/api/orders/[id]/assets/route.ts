import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { orderAssetSchema } from '@/validations/order.schema'
import { canViewOrderDetail } from '@/lib/order-visibility'

const ALLOWED_ROLES = ['admin', 'sales', 'creative', 'operations']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const order = await Order.findById(id).select('assets assignedTeam').lean()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (!canViewOrderDetail(order, session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this order' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: order.assets })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'You are not authorized to add assets to this order' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = orderAssetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()

    // Same "can't act on what you can't see" gate as notes — a creative/
    // production user must be allowed to view this order before uploading an
    // asset to it.
    const existing = await Order.findById(id).select('assignedTeam').lean()
    if (!existing) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (!canViewOrderDetail(existing, session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this order' }, { status: 403 })
    }

    const asset = { ...parsed.data, addedBy: session.id, addedByName: session.name, addedAt: new Date() }
    const order = await Order.findByIdAndUpdate(id, { $push: { assets: asset } }, { new: true }).select('assets orderNumber').lean()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })

    await ActivityLog.create({
      type: 'asset_added',
      description: `Asset "${parsed.data.label}" added to order ${order.orderNumber}`,
      order: id,
      user: session.id,
      userName: session.name,
    })

    return NextResponse.json({ success: true, data: order.assets }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
