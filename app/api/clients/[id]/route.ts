import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Client from '@/models/Client'
import Order from '@/models/Order'
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

async function getClientStats(clientId: string) {
  const [agg] = await Order.aggregate([
    { $match: { client: new Types.ObjectId(clientId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        activeOrders: { $sum: { $cond: [{ $in: ['$status', CLOSED_ORDER_STATUSES] }, 0, 1] } },
        lifetimeBusiness: { $sum: '$totalAmount' },
        lastOrderDate: { $max: '$createdAt' },
      },
    },
  ])

  return {
    totalOrders: agg?.totalOrders ?? 0,
    activeOrders: agg?.activeOrders ?? 0,
    lifetimeBusiness: agg?.lifetimeBusiness ?? 0,
    lastOrderDate: agg?.lastOrderDate ?? null,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'sales'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()

    const [clientDoc, orders, stats] = await Promise.all([
      Client.findById(id).lean(),
      Order.find({ client: id }).sort({ createdAt: -1 }).limit(20).populate('createdBy', 'name').lean(),
      getClientStats(id),
    ])

    if (!clientDoc) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })

    const client = { ...clientDoc, ...stats }
    return NextResponse.json({ success: true, data: { client, orders } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!['admin', 'sales'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only sales or admin can update clients' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const isFinal = body.status === 'active'
    const parsed = isFinal ? clientSchema.safeParse(body) : clientDraftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const client = await Client.findByIdAndUpdate(
      id,
      { ...parsed.data, status: isFinal ? 'active' : (parsed.data.status ?? 'draft'), updatedBy: session.id },
      { new: true, runValidators: true }
    )
    if (!client) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: client })
  } catch (err) {
    const safe = mongoError(err)
    if (safe) return safe
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    await connectDB()
    const client = await Client.findByIdAndUpdate(id, { status: 'inactive', updatedBy: session.id }, { new: true })
    if (!client) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: client })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
