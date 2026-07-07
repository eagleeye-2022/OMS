import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { Role } from './constants'

export const SESSION_COOKIE = 'oms_session'

const FALLBACK_SECRET = 'oms-fallback-secret-change-in-production'

// Resolved lazily on every call (not once at module load) so a missing
// secret fails loudly at the moment a token is signed/verified instead of
// baking an insecure fallback into every request for the lifetime of the
// serverless instance.
function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    // Never sign or verify with the public fallback string in production —
    // anyone reading this source could forge a valid admin session cookie.
    throw new Error(
      'NEXTAUTH_SECRET is not set. Add it to the Vercel project Environment Variables (Production scope) and redeploy.'
    )
  }

  console.warn('[auth] NEXTAUTH_SECRET not set — using an insecure fallback secret for local development only')
  return FALLBACK_SECRET
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('NEXTAUTH_SECRET')) {
      console.error('[auth]', err.message)
    }
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}
