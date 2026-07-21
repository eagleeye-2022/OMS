import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import User from '@/models/User'
import { userSchema } from '@/validations/user.schema'

// Schema for admin updating another user
const adminUpdateSchema = userSchema.partial()

function handleMongoError(err: unknown): NextResponse | null {
  const e = err as { code?: number; name?: string; message?: string }
  if (e.code === 11000) {
    return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 })
  }
  if (e.name === 'ValidationError') {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 })
  }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    await connectDB()
    const user = await User.findById(id).lean()
    if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const isSelf = session.id === id

    if (!isSelf && session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    await connectDB()

    if (isSelf && session.role !== 'admin') {
      // Non-admin self: name only — nothing else about a session user's own
      // account is self-editable.
      const selfSchema = userSchema.pick({ name: true }).required()
      const parsed = selfSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }
      const user = await User.findByIdAndUpdate(id, { name: parsed.data.name }, { new: true, runValidators: true }).lean()
      if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: user })
    }

    // Admin updating any user (including themselves)
    const parsed = adminUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true }).lean()
    if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    const safe = handleMongoError(err)
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
    if (id === session.id) {
      return NextResponse.json({ success: false, error: 'Cannot deactivate yourself' }, { status: 400 })
    }
    await connectDB()
    await User.findByIdAndUpdate(id, { isActive: false })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
