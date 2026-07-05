import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const CLIENT_UPLOAD_ROLES = ['admin', 'sales']
const ORDER_UPLOAD_ROLES = ['admin', 'sales', 'creative', 'production', 'accounts']

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-100)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file')
    const clientId = formData.get('clientId')
    const orderId = formData.get('orderId')
    const field = formData.get('field')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }
    if (typeof field !== 'string' || !field) {
      return NextResponse.json({ success: false, error: 'field is required' }, { status: 400 })
    }

    let entityType: 'clients' | 'orders'
    let entityId: string
    if (typeof clientId === 'string' && clientId) {
      entityType = 'clients'
      entityId = clientId
      if (!CLIENT_UPLOAD_ROLES.includes(session.role)) {
        return NextResponse.json({ success: false, error: 'Only sales or admin can upload files' }, { status: 403 })
      }
    } else if (typeof orderId === 'string' && orderId) {
      entityType = 'orders'
      entityId = orderId
      if (!ORDER_UPLOAD_ROLES.includes(session.role)) {
        return NextResponse.json({ success: false, error: 'You are not authorized to upload files for this order' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ success: false, error: 'clientId or orderId is required' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ success: false, error: 'Unsupported file type. Allowed: PNG, JPG, WEBP, SVG, PDF' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File exceeds the 10MB size limit' }, { status: 400 })
    }

    const safeEntityId = entityId.replace(/[^a-zA-Z0-9]/g, '')
    const safeField = field.replace(/[^a-zA-Z0-9]/g, '')
    const originalName = sanitizeFileName(file.name)
    const fileName = `${safeField}-${Date.now()}-${originalName}`
    const pathname = `uploads/${entityType}/${safeEntityId}/${fileName}`

    // Vercel Blob instead of local disk — the API response shape (url,
    // originalName, mimeType, size, uploadedAt) is unchanged, so every
    // consumer (Order.invoice.fileUrl, Client.assets.*.url, the frontend's
    // <a href>/<Image src>) keeps working untouched; they've always treated
    // this as an opaque string, and a full https:// blob URL satisfies that
    // exactly the same as the old relative /uploads/... path did.
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
