import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Lead from '@/models/Lead'
import ActivityLog from '@/models/ActivityLog'
import { leadAttachmentSchema } from '@/validations/lead.schema'

const LEAD_ROLES = ['admin', 'sales']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!LEAD_ROLES.includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = leadAttachmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const lead = await Lead.findById(id)
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })

    if (parsed.data.kind === 'file') {
      if (!parsed.data.file) return NextResponse.json({ success: false, error: 'file is required' }, { status: 400 })
      lead.attachments.push(parsed.data.file)
      await lead.save()
      await ActivityLog.create({
        type: 'file',
        title: 'File Added',
        description: `${parsed.data.file.originalName} was uploaded`,
        lead: id,
        user: session.id,
        userName: session.name,
      })
    } else {
      if (!parsed.data.link) return NextResponse.json({ success: false, error: 'link is required' }, { status: 400 })
      lead.links.push(parsed.data.link)
      await lead.save()
      await ActivityLog.create({
        type: 'note',
        title: 'Link Added',
        description: `Link "${parsed.data.link.label}" added`,
        lead: id,
        user: session.id,
        userName: session.name,
      })
    }

    return NextResponse.json({ success: true, data: lead })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
