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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()

    const [lead, logs] = await Promise.all([
      Lead.findById(id).populate('assignedTo', 'name email').populate('convertedClient', 'clientCode companyName').populate('convertedOrder', 'orderNumber').lean(),
      ActivityLog.find({ lead: id }).sort({ activityAt: -1, createdAt: -1 }).populate('user', 'name').lean(),
    ])

    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: { lead, logs } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Only sales or admin can update leads' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = leadSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const { assignedTo, ...rest } = parsed.data
    const lead = await Lead.findByIdAndUpdate(
      id,
      {
        ...rest,
        // Empty string ("no assignee selected") must be unset, not cast to
        // ObjectId — an actual id string is passed through as-is.
        ...(assignedTo === '' ? { $unset: { assignedTo: 1 } } : assignedTo ? { assignedTo } : {}),
        updatedBy: session.id,
      },
      { new: true, runValidators: true }
    )
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: lead })
  } catch (err) {
    const safe = mongoError(err)
    if (safe) return safe
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
