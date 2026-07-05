import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { Role } from './constants'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'oms-fallback-secret-change-in-production'
export const SESSION_COOKIE = 'oms_session'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}
