// Renders a payment receipt as a raster image (PNG) on an HTML5 <canvas> —
// deliberately not an HTML/text template, since a rasterized image has no
// editable text layer at all (drawn pixels, not DOM nodes/characters). No new
// dependency: canvas is a native browser API, so this avoids adding a
// headless-rendering stack (Puppeteer/Playwright/@vercel/og) to the server
// just to produce a receipt image. Receipts are regenerated on demand from
// Payment/Order/Client data already in the DB rather than stored as files —
// there's no existing "view a past receipt" surface in the app, so nothing
// would ever read a persisted copy back.
export interface ReceiptData {
  receiptNumber: string
  amount: string
  method: string
  date: string
  orderNumber: string
  clientName: string
}

const WIDTH = 800
const HEIGHT = 620
const MARGIN = 48
const BRAND_RED = '#ef4444'
const INK = '#111827'
const MUTED = '#6b7280'
const FAINT = '#9ca3af'
const RULE = '#e5e7eb'

export function drawReceipt(canvas: HTMLCanvasElement, data: ReceiptData) {
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = BRAND_RED
  ctx.fillRect(0, 0, WIDTH, 6)

  let y = 60
  ctx.fillStyle = BRAND_RED
  ctx.fillRect(MARGIN, y - 24, 36, 36)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 18px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('U', MARGIN + 18, y - 5)

  ctx.fillStyle = INK
  ctx.font = 'bold 20px Arial'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('The Untitled Store', MARGIN + 48, y)

  y += 44
  ctx.strokeStyle = RULE
  ctx.beginPath()
  ctx.moveTo(MARGIN, y)
  ctx.lineTo(WIDTH - MARGIN, y)
  ctx.stroke()

  y += 48
  ctx.fillStyle = INK
  ctx.font = 'bold 26px Arial'
  ctx.fillText('Payment Receipt', MARGIN, y)
  ctx.fillStyle = MUTED
  ctx.font = '15px Arial'
  ctx.textAlign = 'right'
  ctx.fillText(data.receiptNumber, WIDTH - MARGIN, y)
  ctx.textAlign = 'left'

  y += 56
  const rows: [string, string][] = [
    ['Client', data.clientName || '—'],
    ['Order', data.orderNumber || '—'],
    ['Amount', data.amount],
    ['Payment Mode', data.method],
    ['Date', data.date],
  ]
  for (const [label, value] of rows) {
    ctx.fillStyle = MUTED
    ctx.font = '15px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(label, MARGIN, y)
    ctx.fillStyle = INK
    ctx.font = 'bold 17px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(value, WIDTH - MARGIN, y)

    y += 22
    ctx.strokeStyle = RULE
    ctx.beginPath()
    ctx.moveTo(MARGIN, y)
    ctx.lineTo(WIDTH - MARGIN, y)
    ctx.stroke()
    y += 40
  }

  y += 10
  ctx.fillStyle = FAINT
  ctx.font = '13px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('This is a system-generated receipt and does not require a signature.', MARGIN, y)
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
