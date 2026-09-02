// Single source of truth for upload constraints, shared between the API
// route (authoritative enforcement) and every upload UI (fast client-side
// feedback + the file picker's `accept` filter) so they can't drift apart.
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/x-csv',
] as const

export const ALLOWED_UPLOAD_ACCEPT = [
  ...ALLOWED_UPLOAD_MIME_TYPES,
  '.xlsx',
  '.xls',
  '.csv',
].join(',')

// Kept under Vercel's ~4.5MB default request-body ceiling for Node serverless
// functions — anything larger gets rejected upstream of this route handler
// (a non-JSON platform response) before our own size check ever runs.
export const MAX_UPLOAD_FILE_SIZE = 4 * 1024 * 1024 // 4MB
export const MAX_UPLOAD_FILE_SIZE_LABEL = '4MB'

/** Client-side pre-check so obviously-invalid files fail fast with a specific
 * message instead of a round trip to the server. The API route re-validates
 * independently — this is a UX convenience, not the security boundary. */
export function validateUploadFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const isExcelOrCsvExt = ext === 'xlsx' || ext === 'xls' || ext === 'csv'
  const isAllowedType = ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])
  
  if (!isAllowedType && !isExcelOrCsvExt) {
    return 'Unsupported file type. Allowed: PNG, JPG, WEBP, SVG, PDF, XLSX, XLS, CSV'
  }
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return `File exceeds the ${MAX_UPLOAD_FILE_SIZE_LABEL} size limit`
  }
  return null
}

export interface UploadResult {
  url: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
}

/**
 * Shared client-side call to POST /api/upload, used by every upload UI
 * (client asset fields, order Assets & Documents card).
 *
 * A non-2xx JSON error body (auth/validation/storage failures) is already
 * handled cleanly by the API route and just needs unwrapping here. The case
 * this specifically guards against is a response that *isn't* JSON at all —
 * e.g. a host/proxy-level rejection (413 Payload Too Large, a 5xx from a
 * timeout) that never reaches our route handler, so `res.json()` throws a
 * SyntaxError. Previously every upload UI caught that under one generic
 * "Network error" message, which is misleading (nothing about the user's
 * connection failed) and hides which of these it actually was.
 */
export async function performUpload(formData: FormData): Promise<UploadResult> {
  let res: Response
  try {
    res = await fetch('/api/upload', { method: 'POST', body: formData })
  } catch {
    throw new Error('Network error — check your internet connection and try again')
  }

  let payload: { success: boolean; data?: UploadResult; error?: string }
  try {
    payload = await res.json()
  } catch {
    if (res.status === 413) {
      throw new Error(`File is too large for the server to accept (max ${MAX_UPLOAD_FILE_SIZE_LABEL})`)
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('Your session has expired — please log in again')
    }
    throw new Error(`Upload failed — the server returned an unexpected response (status ${res.status})`)
  }

  if (!payload.success || !payload.data) {
    throw new Error(payload.error || 'Upload failed')
  }
  return payload.data
}

/**
 * Forces a real browser download of a (cross-origin) blob storage URL.
 * A plain `<a href={url} download>` does NOT reliably force a download for
 * cross-origin URLs in Chromium — regardless of CORS headers, it just
 * navigates the tab to the resource instead of saving it. Fetching the bytes
 * and downloading from a same-origin `blob:` object URL works correctly.
 * Falls back to opening the URL directly if the fetch fails for any reason.
 */
export async function downloadRemoteFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch (err) {
    console.error('[download] Falling back to opening the file directly:', err)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
