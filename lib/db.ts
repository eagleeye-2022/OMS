import mongoose from 'mongoose'

// Side-effect-only imports so every model schema is registered with
// Mongoose wherever connectDB() is called — not just in routes that also
// reference the model as a value. Each Next.js API route is bundled into
// its own isolated serverless function; a route that only does
// `Order.find().populate('client')` without ever calling `Client.anything()`
// has its `import Client from '@/models/Client'` binding tree-shaken away in
// production (this doesn't happen locally, where one long-running dev
// process keeps every model registered once any route has touched it) —
// causing a `MissingSchemaError: Schema hasn't been registered for model
// "Client"` at runtime. Confirmed in production on /api/dashboard and
// /api/notifications. Side-effect imports (no binding) can't be tree-shaken,
// so registering all models here guarantees populate() always works.
import '@/models/User'
import '@/models/Client'
import '@/models/Order'
import '@/models/Payment'
import '@/models/ActivityLog'
import '@/models/Notification'
import '@/models/Product'
import '@/models/Inventory'
import '@/models/OtpToken'

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
