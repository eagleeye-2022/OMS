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
] as const

export const ALLOWED_UPLOAD_ACCEPT = ALLOWED_UPLOAD_MIME_TYPES.join(',')

export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/** Client-side pre-check so obviously-invalid files fail fast with a specific
 * message instead of a round trip to the server. The API route re-validates
 * independently — this is a UX convenience, not the security boundary. */
export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
    return 'Unsupported file type. Allowed: PNG, JPG, WEBP, SVG, PDF'
  }
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return 'File exceeds the 10MB size limit'
  }
  return null
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
