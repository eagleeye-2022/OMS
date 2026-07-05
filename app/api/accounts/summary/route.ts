import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Order from '@/models/Order'

const ACCOUNTS_ROLES = ['admin', 'accounts']

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!ACCOUNTS_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const now = new Date()

    const [agg] = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalBilled: { $sum: '$totalAmount' },
                balanceOutstanding: { $sum: '$balanceDue' },
              },
            },
          ],
          totalCollected: [
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, sum: { $sum: '$advancePaid' } } },
          ],
          advanceCollected: [
            { $match: { paymentStatus: 'partial' } },
            { $group: { _id: null, sum: { $sum: '$advancePaid' } } },
          ],
          overdue: [
            { $match: { balanceDue: { $gt: 0 }, deliveryDate: { $lt: now }, status: { $ne: 'delivered' } } },
            { $group: { _id: null, sum: { $sum: '$balanceDue' }, count: { $sum: 1 } } },
          ],
          invoicesPending: [
            { $match: { $or: [{ invoice: { $exists: false } }, { 'invoice.fileUrl': { $in: [null, ''] } }] } },
            { $count: 'count' },
          ],
        },
      },
    ])

    const totals = agg.totals[0] ?? { totalBilled: 0, balanceOutstanding: 0 }
    const totalCollected = agg.totalCollected[0]?.sum ?? 0
    const advanceCollected = agg.advanceCollected[0]?.sum ?? 0
    const overdueAmount = agg.overdue[0]?.sum ?? 0
    const overdueCount = agg.overdue[0]?.count ?? 0
    const invoicesPending = agg.invoicesPending[0]?.count ?? 0

    return NextResponse.json({
      success: true,
      data: {
        totalBilled: totals.totalBilled,
        totalCollected,
        balanceOutstanding: totals.balanceOutstanding,
        overdueAmount,
        overdueCount,
        advanceCollected,
        invoicesPending,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
