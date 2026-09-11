import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Lead from '@/models/Lead'
import ActivityLog from '@/models/ActivityLog'
import { leadSchema } from '@/validations/lead.schema'

const LEAD_ROLES = ['admin', 'sales']

function mongoError(err: unknown): NextResponse | null {
  const e = err as { code?: number; name?: string; message?: string }
  if (e.name === 'ValidationError') {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
  if (e.code === 11000) {
    return NextResponse.json({ success: false, error: 'A lead with conflicting unique details already exists' }, { status: 409 })
  }
  return null
}

// Same-calendar-month-vs-previous-month count, used for every stat card's
// "vs last month" delta. Returns null when the previous month had zero leads
// (a percentage change would be undefined/infinite) so the UI can render a
// neutral state instead of a nonsensical number.
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = status ? { status } : {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) query.createdAt.$lte = new Date(`${endDate}T23:59:59.999`)
    }

    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [leads, total, totalLastMonth, newThisMonth, newLastMonth, lostCount, lostLastMonth, convertedCount, convertedLastMonth] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignedTo', 'name').lean(),
      Lead.countDocuments(query),
      Lead.countDocuments({ createdAt: { $lt: startOfThisMonth } }),
      Lead.countDocuments({ status: 'new_enquiries', createdAt: { $gte: startOfThisMonth } }),
      Lead.countDocuments({ status: 'new_enquiries', createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
      Lead.countDocuments({ status: 'lost' }),
      Lead.countDocuments({ status: 'lost', updatedAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
      Lead.countDocuments({ status: 'converted' }),
      Lead.countDocuments({ status: 'converted', updatedAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
    ])

    const stats = {
      total,
      totalDelta: percentChange(total, totalLastMonth),
      newEnquiries: newThisMonth,
      newEnquiriesDelta: percentChange(newThisMonth, newLastMonth),
      lost: lostCount,
      lostDelta: percentChange(lostCount, lostLastMonth),
      converted: convertedCount,
      convertedDelta: percentChange(convertedCount, convertedLastMonth),
    }

    return NextResponse.json({ success: true, data: leads, total, page, limit, stats })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only sales or admin can create leads' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = leadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const { assignedTo, ...rest } = parsed.data
    const lead = await Lead.create({
      ...rest,
      // Empty string ("no assignee selected") must be omitted, not passed
      // through — Mongoose would try to cast '' to an ObjectId and throw.
      ...(assignedTo ? { assignedTo } : {}),
      createdBy: session.id,
    })

    await ActivityLog.create({
      type: 'lead_created',
      description: `New lead "${lead.name}" added`,
      lead: lead._id,
      user: session.id,
      userName: session.name,
    })

    return NextResponse.json({ success: true, data: lead }, { status: 201 })
  } catch (err) {
    const safe = mongoError(err)
    if (safe) return safe
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
