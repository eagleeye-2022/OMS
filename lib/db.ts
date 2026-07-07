import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cache

// Resolved lazily (not at module load) so a missing/malformed value fails
// loudly inside connectDB()'s try/catch rather than crashing the whole
// serverless function at import time with an opaque error.
function resolveMongoUri(): string {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MONGODB_URI is not set. Add it to the Vercel project Environment Variables (Production scope) and redeploy.'
      )
    }
    console.warn('[db] MONGODB_URI not set — falling back to mongodb://localhost:27017/oms for local dev')
    return 'mongodb://localhost:27017/oms'
  }

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    // Catches the common copy/paste mistake of the value being
    // "MONGODB_URI=mongodb+srv://..." (key pasted twice) or similar.
    throw new Error(
      `MONGODB_URI is malformed — expected it to start with "mongodb://" or "mongodb+srv://" but got "${uri.slice(0, 24)}...". Check the Vercel env var value for a duplicated key/prefix.`
    )
  }

  return uri
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  if (!cache.promise) {
    const uri = resolveMongoUri()
    cache.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((mg) => {
        console.log('[db] MongoDB connected')
        return mg
      })
      .catch((err) => {
        // Without this reset, a single failed attempt (bad URI, IP not
        // whitelisted, transient network blip) would poison the cache and
        // every subsequent request would keep awaiting the same rejected
        // promise forever, until the serverless instance recycled.
        cache.promise = null
        console.error('[db] MongoDB connection failed:', err instanceof Error ? err.message : err)
        throw err
      })
  }

  cache.conn = await cache.promise
  return cache.conn
}
