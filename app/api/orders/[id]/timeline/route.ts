import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { canViewOrderDetail, filterActivityLogsForRole } from '@/lib/order-visibility'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await connectDB()

    const order = await Order.findById(id).select('assignedTeam').lean()
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    if (!canViewOrderDetail(order, session)) {
      return NextResponse.json({ success: false, error: 'You do not have access to this order' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const logs = await ActivityLog.find({ order: id }).sort({ createdAt: -1 }).limit(limit).lean()

    return NextResponse.json({ success: true, data: filterActivityLogsForRole(logs, session.role, session.email) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
