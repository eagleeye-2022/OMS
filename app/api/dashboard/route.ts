import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import Client from '@/models/Client'
import ActivityLog from '@/models/ActivityLog'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalOrders,
      activeOrders,
      pendingApproval,
      delayed,
      revenueAgg,
      outstandingAgg,
      newThisMonth,
      pipelineAgg,
      recentOrders,
      deliveryDeadlines,
      recentActivity,
      stageAgg,
      monthlyAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({
        status: { $in: ['design_review', 'design_approved', 'in_production', 'quality_check', 'shipping_ready', 'dispatched', 'in_transit'] },
      }),
      Order.countDocuments({ designStatus: 'in_review' }),
      Order.countDocuments({ status: 'delayed' }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$balanceDue' } } }]),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        {
          $match: {
            status: { $in: ['design_review', 'design_approved', 'in_production', 'quality_check', 'shipping_ready', 'dispatched', 'in_transit'] },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.find({ status: { $in: ['design_review', 'in_production', 'quality_check', 'shipping_ready', 'delayed'] } })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('client', 'companyName')
        .select('orderNumber status productType quantity deliveryDate totalAmount advancePaid balanceDue paymentStatus')
        .lean(),
      Order.find({
        status: { $nin: ['delivered', 'cancelled'] },
        deliveryDate: { $lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      })
        .sort({ deliveryDate: 1 })
        .limit(5)
        .populate('client', 'companyName')
        .select('orderNumber deliveryDate status')
        .lean(),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('order', 'orderNumber')
        .lean(),
      Order.aggregate([
        {
          $match: {
            status: { $in: ['design_review', 'design_approved', 'in_production', 'quality_check', 'shipping_ready'] },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Rolling 12-month window (oldest to current month) for the dashboard's
      // Monthly Overview chart — real order counts and revenue, not the
      // static placeholder bars the chart used to render.
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
    ])

    const statusMap: Record<string, string> = {
      design_review: 'creative',
      design_approved: 'creative',
      in_production: 'production',
      quality_check: 'qc',
      shipping_ready: 'shipping',
      dispatched: 'shipping',
      in_transit: 'shipping',
    }

    const pipeline: Record<string, number> = { creative: 0, production: 0, qc: 0, shipping: 0, pending: 0 }
    for (const { _id, count } of pipelineAgg) {
      const key = statusMap[_id as string] || 'pending'
      pipeline[key] = (pipeline[key] || 0) + (count as number)
    }

    const stageCounts: Record<string, number> = {}
    for (const { _id, count } of stageAgg) {
      stageCounts[_id as string] = count as number
    }

    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyByKey = new Map<string, { orders: number; revenue: number }>()
    for (const row of monthlyAgg as Array<{ _id: { y: number; m: number }; orders: number; revenue: number }>) {
      monthlyByKey.set(`${row._id.y}-${row._id.m}`, { orders: row.orders, revenue: row.revenue })
    }
    const monthlySeries = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const entry = monthlyByKey.get(`${d.getFullYear()}-${d.getMonth() + 1}`)
      return { label: MONTH_LABELS[d.getMonth()], orders: entry?.orders ?? 0, revenue: entry?.revenue ?? 0 }
    })

    // Alerts: overdue + design pending
    const overdueOrders = await Order.find({
      status: 'delayed',
    })
      .limit(3)
      .select('orderNumber deliveryDate')
      .lean()

    const pendingDesignOrders = await Order.find({ designStatus: 'in_review' })
      .limit(3)
      .populate('client', 'companyName')
      .select('orderNumber client')
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          activeOrders,
          pendingApproval,
          delayed,
          revenue: revenueAgg[0]?.total || 0,
          outstanding: outstandingAgg[0]?.total || 0,
          newThisMonth,
        },
        pipeline,
        stageCounts,
        monthlySeries,
        recentOrders,
        deliveryDeadlines,
        recentActivity,
        alerts: {
          overdue: overdueOrders,
          pendingDesign: pendingDesignOrders,
        },
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
