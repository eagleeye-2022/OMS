import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Notification from '@/models/Notification'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    const query = unreadOnly ? { isRead: false } : {}
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('order', 'orderNumber')
      .populate('client', 'companyName')
      .lean()

    const unreadCount = await Notification.countDocuments({ isRead: false })
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
