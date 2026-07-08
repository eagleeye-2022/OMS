import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'
import Payment from '@/models/Payment'
import ActivityLog from '@/models/ActivityLog'

// Single source of truth for "active" (currently in the creative→shipping
// pipeline) — shared by the Active Orders KPI, Pipeline Breakdown, and Stage
// Monitor so they can never drift apart and disagree on the same order set.
const ACTIVE_STATUSES = ['design_review', 'design_approved', 'in_production', 'quality_check', 'shipping_ready', 'dispatched', 'in_transit']

function count(facetResult: unknown): number {
  const arr = facetResult as Array<{ n: number }> | undefined
  return arr?.[0]?.n ?? 0
}

function sum(facetResult: unknown): number {
  const arr = facetResult as Array<{ sum: number }> | undefined
  return arr?.[0]?.sum ?? 0
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthRange = { $gte: thisMonthStart }
    const lastMonthRange = { $gte: lastMonthStart, $lt: thisMonthStart }

    const [
      orderFacets,
      paymentFacets,
      pipelineAgg,
      recentOrders,
      deliveryDeadlines,
      recentActivity,
      stageAgg,
      monthlyOrdersAgg,
      monthlyRevenueAgg,
    ] = await Promise.all([
      // Every KPI's current-month/last-month/real-time-snapshot count, in one
      // pass — same ACTIVE_STATUSES filter used by Pipeline Breakdown/Stage
      // Monitor below, so the KPI tiles and those charts can never disagree.
      Order.aggregate([
        {
          $facet: {
            totalOrdersThisMonth: [{ $match: { createdAt: thisMonthRange } }, { $count: 'n' }],
            totalOrdersLastMonth: [{ $match: { createdAt: lastMonthRange } }, { $count: 'n' }],
            activeOrdersNow: [{ $match: { status: { $in: ACTIVE_STATUSES } } }, { $count: 'n' }],
            activeOrdersThisMonth: [{ $match: { status: { $in: ACTIVE_STATUSES }, createdAt: thisMonthRange } }, { $count: 'n' }],
            activeOrdersLastMonth: [{ $match: { status: { $in: ACTIVE_STATUSES }, createdAt: lastMonthRange } }, { $count: 'n' }],
            pendingApprovalNow: [{ $match: { designStatus: 'in_review' } }, { $count: 'n' }],
            pendingApprovalThisMonth: [{ $match: { designStatus: 'in_review', createdAt: thisMonthRange } }, { $count: 'n' }],
            pendingApprovalLastMonth: [{ $match: { designStatus: 'in_review', createdAt: lastMonthRange } }, { $count: 'n' }],
            delayedNow: [{ $match: { status: 'delayed' } }, { $count: 'n' }],
            delayedThisMonth: [{ $match: { status: 'delayed', createdAt: thisMonthRange } }, { $count: 'n' }],
            delayedLastMonth: [{ $match: { status: 'delayed', createdAt: lastMonthRange } }, { $count: 'n' }],
            // Cancelled orders' stale balances shouldn't count as real outstanding
            // money — mirrors the same exclusion already used by the Accounts
            // module's summary (app/api/accounts/summary/route.ts).
            outstandingNow: [{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, sum: { $sum: '$balanceDue' } } }],
            outstandingThisMonth: [{ $match: { status: { $ne: 'cancelled' }, createdAt: thisMonthRange } }, { $group: { _id: null, sum: { $sum: '$balanceDue' } } }],
            outstandingLastMonth: [{ $match: { status: { $ne: 'cancelled' }, createdAt: lastMonthRange } }, { $group: { _id: null, sum: { $sum: '$balanceDue' } } }],
          },
        },
      ]),
      // Revenue is real money actually collected (Payment records, tied to
      // receipts/invoices), not the order's quoted totalAmount — a billed
      // amount isn't revenue until it's paid.
      Payment.aggregate([
        {
          $facet: {
            thisMonth: [{ $match: { paymentDate: thisMonthRange } }, { $group: { _id: null, sum: { $sum: '$amount' } } }],
            lastMonth: [{ $match: { paymentDate: lastMonthRange } }, { $group: { _id: null, sum: { $sum: '$amount' } } }],
          },
        },
      ]),
      Order.aggregate([
        { $match: { status: { $in: ACTIVE_STATUSES } } },
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
        { $match: { status: { $in: ACTIVE_STATUSES } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Rolling 12-month window (oldest to current month) for the dashboard's
      // Monthly Overview "Orders" series — same createdAt-based cohort the
      // Total Orders KPI uses, so the current month's bar always matches it.
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            orders: { $sum: 1 },
          },
        },
      ]),
      // Same rolling window for the "Revenue" series, from Payment records
      // (paymentDate) — matches the Revenue KPI's data source exactly.
      Payment.aggregate([
        { $match: { paymentDate: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } } },
        {
          $group: {
            _id: { y: { $year: '$paymentDate' }, m: { $month: '$paymentDate' } },
            revenue: { $sum: '$amount' },
          },
        },
      ]),
    ])

    const f = orderFacets[0]
    const totalOrders = count(f.totalOrdersThisMonth)
    const totalOrdersDelta = totalOrders - count(f.totalOrdersLastMonth)

    const activeOrders = count(f.activeOrdersNow)
    const activeOrdersDelta = count(f.activeOrdersThisMonth) - count(f.activeOrdersLastMonth)

    const pendingApproval = count(f.pendingApprovalNow)
    const pendingApprovalDelta = count(f.pendingApprovalThisMonth) - count(f.pendingApprovalLastMonth)

    const delayed = count(f.delayedNow)
    const delayedDelta = count(f.delayedThisMonth) - count(f.delayedLastMonth)

    const outstanding = sum(f.outstandingNow)
    const outstandingDelta = sum(f.outstandingThisMonth) - sum(f.outstandingLastMonth)

    const p = paymentFacets[0]
    const revenue = sum(p.thisMonth)
    const revenueDelta = revenue - sum(p.lastMonth)

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
    const monthlyOrdersByKey = new Map<string, number>()
    for (const row of monthlyOrdersAgg as Array<{ _id: { y: number; m: number }; orders: number }>) {
      monthlyOrdersByKey.set(`${row._id.y}-${row._id.m}`, row.orders)
    }
    const monthlyRevenueByKey = new Map<string, number>()
    for (const row of monthlyRevenueAgg as Array<{ _id: { y: number; m: number }; revenue: number }>) {
      monthlyRevenueByKey.set(`${row._id.y}-${row._id.m}`, row.revenue)
    }
    const monthlySeries = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      return {
        label: MONTH_LABELS[d.getMonth()],
        orders: monthlyOrdersByKey.get(key) ?? 0,
        revenue: monthlyRevenueByKey.get(key) ?? 0,
      }
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
          totalOrdersDelta,
          activeOrders,
          activeOrdersDelta,
          pendingApproval,
          pendingApprovalDelta,
          delayed,
          delayedDelta,
          revenue,
          revenueDelta,
          outstanding,
          outstandingDelta,
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
