import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import ActivityLog from '@/models/ActivityLog'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query: Record<string, string> = {}
    if (orderId) query.order = orderId

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('order', 'orderNumber')
      .populate('client', 'companyName')
      .lean()

    return NextResponse.json({ success: true, data: logs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
