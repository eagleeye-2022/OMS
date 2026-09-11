import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Lead from '@/models/Lead'
import ActivityLog from '@/models/ActivityLog'
import { leadStatusSchema } from '@/validations/lead.schema'
import { LEAD_STATUS_LABEL, type LeadStatus } from '@/lib/constants'
import { convertLeadToClientOrder } from '@/lib/lead-conversion'

const LEAD_ROLES = ['admin', 'sales']

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = leadStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const lead = await Lead.findById(id)
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })

    const previousStatus = lead.status
    const nextStatus = parsed.data.status as LeadStatus
    lead.status = nextStatus
    lead.set('updatedBy', session.id)

    let conversion: { client: unknown; order: unknown } | null = null
    if (nextStatus === 'converted' && !lead.convertedClient) {
      conversion = await convertLeadToClientOrder(lead, { id: session.id, name: session.name })
    }

    await lead.save()

    if (previousStatus !== nextStatus) {
      await ActivityLog.create({
        type: 'status_changed',
        title: 'Status Changed',
        description: `Status updated to ${LEAD_STATUS_LABEL[nextStatus]}`,
        lead: lead._id,
        user: session.id,
        userName: session.name,
        metadata: { from: previousStatus, to: nextStatus },
      })
    }

    return NextResponse.json({ success: true, data: lead, conversion })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
