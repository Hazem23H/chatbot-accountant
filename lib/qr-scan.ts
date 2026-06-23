import jsQR from 'jsqr'

// Cap the working resolution — jsQR is O(pixels), and huge phone photos are
// slow without improving detection much past this.
const MAX_DIM = 2000

/**
 * Read a QR code out of an uploaded invoice image, entirely in the browser.
 * Returns the decoded payload (for ZATCA: a Base64 TLV string) or null when no
 * QR is found or the file isn't a scannable raster image.
 *
 * This is the high-value step: the model can't reliably read a QR barcode, so
 * scanning it here lets us decode the real payload and cross-check it against
 * the printed totals/VAT/seller. PDFs aren't rasterised yet — they return null
 * and fall back to the model's hasQrCode guess.
 */
export async function scanQrFromFile(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!file.type.startsWith('image/')) return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    ctx.drawImage(bitmap, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)

    // attemptBoth handles QRs printed light-on-dark as well as the usual case.
    const result = jsQR(data, w, h, { inversionAttempts: 'attemptBoth' })
    return result?.data?.trim() || null
  } catch {
    return null
  } finally {
    bitmap.close?.()
  }
}
