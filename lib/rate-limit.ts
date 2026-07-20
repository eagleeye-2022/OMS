import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

interface Bucket {
  count: number
  resetAt: number
}

// Fallback store — kept as the local-dev/no-infra path so the app still
// works with zero external setup. Single-instance only; superseded by the
// Redis path below whenever Upstash is configured.
const buckets = new Map<string, Bucket>()

let redisClient: Redis | null | undefined // undefined = not yet resolved this process

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redisClient = url && token ? new Redis({ url, token }) : null
  return redisClient
}

function checkInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Opportunistic sweep of expired entries so the map doesn't grow forever
  // on a long-running instance.
  if (buckets.size > 500) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

async function checkRedis(client: Redis, key: string, limit: number, windowMs: number): Promise<boolean> {
  const redisKey = `ratelimit:${key}`
  // INCR the counter and set its expiry only the first time the key is
  // created (NX) — a fixed-window counter in one round trip. Precise enough
  // for throttling login/OTP abuse; doesn't need a sliding-window algorithm.
  const [count] = await client.pipeline().incr(redisKey).pexpire(redisKey, windowMs, 'NX').exec()
  return count <= limit
}

/**
 * Distributed when UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are set
 * (shared across every serverless instance — the production-grade path);
 * otherwise falls back to an in-memory, single-instance limiter so local dev
 * and preview environments work with zero external infra.
 *
 * Fails OPEN (allows the request) if Redis itself errors, so a transient
 * Upstash outage degrades to "no rate limiting" instead of locking every
 * user out — but it's logged so the outage is visible.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const client = getRedis()
  let allowed: boolean
  let store: 'redis' | 'memory' = client ? 'redis' : 'memory'

  if (client) {
    try {
      allowed = await checkRedis(client, key, limit, windowMs)
    } catch (err) {
      console.error('[rate-limit] Upstash request failed — failing open for this check:', err instanceof Error ? err.message : err)
      store = 'memory'
      allowed = checkInMemory(key, limit, windowMs)
    }
  } else {
    allowed = checkInMemory(key, limit, windowMs)
  }

  if (!allowed) {
    console.warn(JSON.stringify({ event: 'rate_limit_blocked', key, limit, windowMs, store }))
  }

  return allowed
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
