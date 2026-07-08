import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Client from '@/models/Client'
import ActivityLog from '@/models/ActivityLog'
import { clientSchema, clientDraftSchema } from '@/validations/client.schema'
import { CLOSED_ORDER_STATUSES } from '@/lib/constants'

function mongoError(err: unknown): NextResponse | null {
  const e = err as { code?: number; name?: string; message?: string }
  if (e.name === 'ValidationError') {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
  if (e.code === 11000) {
    return NextResponse.json({ success: false, error: 'A client with conflicting unique details already exists' }, { status: 409 })
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'sales'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = status ? { status } : { status: { $ne: 'inactive' } }
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPersonName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    // Sentinel used so clients with no active orders sort after every client
    // that has a real upcoming/overdue deadline (MongoDB sorts null/missing
    // BEFORE dates in ascending order, which is the opposite of what we want).
    const NO_DEADLINE_SENTINEL = new Date(8640000000000000)

    const [clients, total] = await Promise.all([
      Client.aggregate([
        { $match: query },
        // The lookup now has to run before pagination (not after, as before)
        // since sorting depends on each client's linked active orders — the
        // nearest deadline among them, not creation time.
        {
          $lookup: {
            from: 'orders',
            let: { clientId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$client', '$$clientId'] }, status: { $nin: CLOSED_ORDER_STATUSES } } },
              { $project: { deliveryDate: 1 } },
            ],
            as: 'activeOrdersAgg',
          },
        },
        {
          $addFields: {
            activeOrders: { $size: '$activeOrdersAgg' },
            nearestDeadline: { $ifNull: [{ $min: '$activeOrdersAgg.deliveryDate' }, NO_DEADLINE_SENTINEL] },
          },
        },
        { $sort: { nearestDeadline: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { activeOrdersAgg: 0, nearestDeadline: 0 } },
      ]),
      Client.countDocuments(query),
    ])

    return NextResponse.json({ success: true, data: clients, total, page, limit })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'sales'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only sales or admin can create clients' }, { status: 403 })
    }

    const body = await req.json()
    const isFinal = body.status === 'active'
    const parsed = isFinal ? clientSchema.safeParse(body) : clientDraftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const client = await Client.create({
      ...parsed.data,
      status: isFinal ? 'active' : 'draft',
      createdBy: session.id,
    })

    await ActivityLog.create({
      type: 'client_created',
      description: `New client "${client.companyName}" added`,
      client: client._id,
      user: session.id,
      userName: session.name,
    })

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (err) {
    const safe = mongoError(err)
    if (safe) return safe
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
