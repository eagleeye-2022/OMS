import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import User from '@/models/User'
import { userSchema } from '@/validations/user.schema'

// Schema for admin updating another user — password excluded (use dedicated flow)
const adminUpdateSchema = userSchema.omit({ password: true }).partial()

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
    const user = await User.findById(id).select('-password').lean()
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

    // ── Password change path: uses .save() to trigger pre-save bcrypt hook ──
    if (body.password) {
      const userDoc = await User.findById(id).select('+password')
      if (!userDoc) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

      // Self-update requires current password verification
      if (isSelf) {
        if (!body.currentPassword) {
          return NextResponse.json({ success: false, error: 'Current password is required' }, { status: 400 })
        }
        const ok = await userDoc.comparePassword(body.currentPassword)
        if (!ok) {
          return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 })
        }
      }

      const pwSchema = z.string().min(6, 'Password must be at least 6 characters')
      const pwParsed = pwSchema.safeParse(body.password)
      if (!pwParsed.success) {
        return NextResponse.json({ success: false, error: pwParsed.error.issues[0].message }, { status: 400 })
      }

      // Apply allowed fields for each actor
      if (isSelf && session.role !== 'admin') {
        // Non-admin self: name + password only
        if (body.name && typeof body.name === 'string') userDoc.name = body.name.trim()
      } else if (session.role === 'admin') {
        // Admin: can update role, isActive, name, email alongside password
        const parsed = adminUpdateSchema.safeParse(body)
        if (!parsed.success) {
          return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
        }
        if (parsed.data.name !== undefined) userDoc.name = parsed.data.name
        if (parsed.data.email !== undefined) userDoc.email = parsed.data.email
        if (parsed.data.role !== undefined) userDoc.role = parsed.data.role
        if (parsed.data.phone !== undefined) userDoc.phone = parsed.data.phone
        if (typeof parsed.data.isActive === 'boolean') userDoc.isActive = parsed.data.isActive
      }

      userDoc.password = pwParsed.data
      await userDoc.save()

      const saved = await User.findById(id).select('-password').lean()
      return NextResponse.json({ success: true, data: saved })
    }

    // ── Non-password update path ──────────────────────────────────────────────
    if (isSelf && session.role !== 'admin') {
      // Non-admin self: name only
      const selfSchema = z.object({ name: z.string().min(2, 'Name must be at least 2 characters') })
      const parsed = selfSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
      }
      const user = await User.findByIdAndUpdate(id, { name: parsed.data.name }, { new: true, runValidators: true })
        .select('-password')
        .lean()
      if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: user })
    }

    // Admin updating another user (no password change)
    const parsed = adminUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    const user = await User.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true })
      .select('-password')
      .lean()
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
