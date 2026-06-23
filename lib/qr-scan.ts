import jsQR from 'jsqr'

// Cap the working resolution — jsQR is O(pixels), and huge images don't improve
// detection much past this.
const MAX_IMG_DIM = 2000
// PDFs are rendered larger: their QR is often physically small on the page, so
// rasterising at higher resolution materially improves the read rate.
const MAX_PDF_DIM = 2200
// Only the first few pages are worth scanning for an invoice QR.
const MAX_PDF_PAGES = 3

/** Run jsQR over a fully-drawn 2D context. Returns the payload or null. */
function decodeContext(ctx: CanvasRenderingContext2D, w: number, h: number): string | null {
  const { data } = ctx.getImageData(0, 0, w, h)
  // attemptBoth handles QRs printed light-on-dark as well as the usual case.
  const result = jsQR(data, w, h, { inversionAttempts: 'attemptBoth' })
  return result?.data?.trim() || null
}

async function scanImage(file: File): Promise<string | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }
  try {
    const scale = Math.min(1, MAX_IMG_DIM / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)
    return decodeContext(ctx, w, h)
  } finally {
    bitmap.close?.()
  }
}

async function scanPdf(file: File): Promise<string | null> {
  // Loaded on demand so pdf.js (and its worker) never enters the main bundle
  // or runs unless a PDF is actually scanned.
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  try {
    const pages = Math.min(pdf.numPages, MAX_PDF_PAGES)
    for (let p = 1; p <= pages; p++) {
      const page = await pdf.getPage(p)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(3, MAX_PDF_DIM / Math.max(base.width, base.height))
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) continue

      await page.render({ canvas, viewport }).promise
      const found = decodeContext(ctx, canvas.width, canvas.height)
      if (found) return found
    }
    return null
  } finally {
    loadingTask.destroy()
  }
}

/**
 * Read a QR code out of an uploaded invoice, entirely in the browser. Returns
 * the decoded payload (for ZATCA: a Base64 TLV string) or null when no QR is
 * found or the file isn't scannable.
 *
 * This is the high-value step: the model can't reliably read a QR barcode, so
 * scanning it here lets us decode the real payload and cross-check it against
 * the printed totals/VAT/seller. Both raster images and PDFs are supported.
 */
export async function scanQrFromFile(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    if (file.type.startsWith('image/')) return await scanImage(file)
    if (file.type === 'application/pdf') return await scanPdf(file)
    return null
  } catch {
    return null
  }
}
