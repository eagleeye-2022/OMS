import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Client from '@/models/Client'
import { clientStatusSchema } from '@/validations/client.schema'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = clientStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const client = await Client.findByIdAndUpdate(
      id,
      { status: parsed.data.status, updatedBy: session.id },
      { new: true }
    )
    if (!client) return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: client })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
