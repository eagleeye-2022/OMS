import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Lead from '@/models/Lead'
import ActivityLog from '@/models/ActivityLog'
import { leadActivitySchema } from '@/validations/lead.schema'

const LEAD_ROLES = ['admin', 'sales']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await connectDB()
    const logs = await ActivityLog.find({ lead: id }).sort({ createdAt: -1 }).populate('user', 'name').lean()
    return NextResponse.json({ success: true, data: logs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = leadActivitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const lead = await Lead.findById(id).select('_id')
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })

    const { type, title, date, time, description } = parsed.data
    let isoTime = (time || '').trim()
    if (isoTime.length === 4) isoTime = `0${isoTime}`
    if (isoTime.length === 5) isoTime = `${isoTime}:00`
    const activityAt = new Date(`${date}T${isoTime}`)
    if (Number.isNaN(activityAt.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date/time format' }, { status: 400 })
    }

    const log = await ActivityLog.create({
      type,
      title,
      description: description || title,
      activityAt,
      lead: id,
      user: session.id,
      userName: session.name || 'User',
    })

    return NextResponse.json({ success: true, data: log }, { status: 201 })
  } catch (err) {
    console.error('Error creating activity log:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
