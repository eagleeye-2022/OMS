import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Notification from '@/models/Notification'
import { FINANCE_NOTIFICATION_TYPES, canViewFinanceDetails, filterNotificationsForRole } from '@/lib/order-visibility'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    const query = unreadOnly ? { isRead: false } : {}
    const rawNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('order', 'orderNumber')
      .populate('client', 'companyName')
      .lean()
    const notifications = filterNotificationsForRole(rawNotifications, session.role)

    // Counted separately (not derived from the capped 50-item list above) so
    // it stays accurate once there are more than 50 notifications — but must
    // apply the same role filter at the query level, or a restricted role's
    // badge count would include finance notifications it never actually sees.
    const unreadCount = await Notification.countDocuments(
      canViewFinanceDetails(session.role) ? { isRead: false } : { isRead: false, type: { $nin: Array.from(FINANCE_NOTIFICATION_TYPES) } }
    )
    return NextResponse.json({ success: true, data: notifications, unreadCount })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    await connectDB()

    if (body.markAllRead) {
      await Notification.updateMany({ isRead: false }, { isRead: true })
    } else if (body.id) {
      await Notification.findByIdAndUpdate(body.id, { isRead: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
