import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import ActivityLog from '@/models/ActivityLog'
import Order from '@/models/Order'
import { canViewOrderDetail, filterActivityLogsForRole } from '@/lib/order-visibility'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Unscoped (no `order` param) is a company-wide activity feed across
    // every order — no current UI consumes it, but if it ever is, an
    // unrestricted feed would let any authenticated role browse every other
    // order's history regardless of assignment/visibility. Restricted to
    // admin, matching the equivalent Dashboard "Recent Activity" widget
    // (app/api/dashboard/route.ts), the only other place this shape exists.
    if (!orderId && session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Scoped to one order: same per-order visibility rule as GET
    // /api/orders/[id] — a creative/production session can't pull another
    // order's history just by knowing its id, even via this side endpoint.
    if (orderId) {
      const order = await Order.findById(orderId).select('assignedTeam').lean()
      if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
      if (!canViewOrderDetail(order, session)) {
        return NextResponse.json({ success: false, error: 'You do not have access to this order' }, { status: 403 })
      }
    }

    const query: Record<string, string> = {}
    if (orderId) query.order = orderId

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('order', 'orderNumber')
      .populate('client', 'companyName')
      .lean()

    return NextResponse.json({ success: true, data: filterActivityLogsForRole(logs, session.role, session.email) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
