import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getSession } from '@/lib/auth'
import User from '@/models/User'
import { userSchema } from '@/validations/user.schema'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    await connectDB()
    const users = await User.find().sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, data: users })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = userSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }

    await connectDB()
    const existing = await User.findOne({ email: parsed.data.email })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 })
    }

    // No password to set — the new user logs in via email + OTP the first
    // time they visit /login, same as everyone else.
    const user = await User.create(parsed.data)
    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
