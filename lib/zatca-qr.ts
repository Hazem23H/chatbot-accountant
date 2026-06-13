import type { ValidationFlag, ExtractedInvoice } from '@/lib/zatca-rules'

// ZATCA QR codes are Base64-encoded TLV (Tag-Length-Value) byte strings.
// Phase 1 mandates tags 1-5. Phase 2 adds cryptographic tags 6-9.
//
// Tag | Field
// ----|---------------------------------
//  1  | Seller name
//  2  | Seller VAT registration number
//  3  | Invoice timestamp (ISO 8601)
//  4  | Invoice total (incl. VAT)
//  5  | VAT total
//  6  | Invoice XML hash        (Phase 2)
//  7  | ECDSA signature         (Phase 2)
//  8  | Public key              (Phase 2)
//  9  | Stamp signature         (Phase 2)

const TOLERANCE = 0.01

export interface DecodedQr {
  sellerName?: string
  sellerVat?: string
  timestamp?: string
  total?: number
  vatTotal?: number
  // Phase 2 — presence only; full crypto verification is out of scope here
  hasHash: boolean
  hasSignature: boolean
  hasPublicKey: boolean
  hasStampSignature: boolean
  // Every tag we saw, for debugging / display
  rawTags: Record<number, string>
}

export type QrParseResult =
  | { ok: true; decoded: DecodedQr }
  | { ok: false; error: 'EMPTY' | 'BAD_BASE64' | 'MALFORMED_TLV' }

function isBase64(s: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(s.replace(/\s/g, ''))
}

/**
 * Decode a ZATCA QR payload (Base64 TLV) into structured fields.
 * Pure and deterministic — no network, no LLM. Safe to unit-test exhaustively.
 */
export function parseZatcaQr(payload: string | undefined | null): QrParseResult {
  const trimmed = payload?.trim()
  if (!trimmed) return { ok: false, error: 'EMPTY' }
  if (!isBase64(trimmed)) return { ok: false, error: 'BAD_BASE64' }

  let bytes: Buffer
  try {
    bytes = Buffer.from(trimmed, 'base64')
  } catch {
    return { ok: false, error: 'BAD_BASE64' }
  }
  if (bytes.length === 0) return { ok: false, error: 'BAD_BASE64' }

  const rawTags: Record<number, string> = {}
  let i = 0
  while (i < bytes.length) {
    // Need at least a tag byte and a length byte.
    if (i + 1 >= bytes.length) return { ok: false, error: 'MALFORMED_TLV' }
    const tag = bytes[i]
    const len = bytes[i + 1]
    const valueStart = i + 2
    const valueEnd = valueStart + len
    if (valueEnd > bytes.length) return { ok: false, error: 'MALFORMED_TLV' }

    // Tags 1-5 are UTF-8 text; 6-9 are binary — keep base64 so display is safe.
    const slice = bytes.subarray(valueStart, valueEnd)
    rawTags[tag] = tag <= 5 ? slice.toString('utf8') : slice.toString('base64')
    i = valueEnd
  }

  if (Object.keys(rawTags).length === 0) return { ok: false, error: 'MALFORMED_TLV' }

  const num = (v?: string) => {
    if (v === undefined) return undefined
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    ok: true,
    decoded: {
      sellerName: rawTags[1],
      sellerVat: rawTags[2],
      timestamp: rawTags[3],
      total: num(rawTags[4]),
      vatTotal: num(rawTags[5]),
      hasHash: 6 in rawTags,
      hasSignature: 7 in rawTags,
      hasPublicKey: 8 in rawTags,
      hasStampSignature: 9 in rawTags,
      rawTags,
    },
  }
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE
}

function normalizeVat(v?: string): string | undefined {
  return v?.replace(/\s/g, '')
}

/**
 * Cross-check the decoded QR against the fields read off the invoice face.
 * This is the high-value part: mismatches between the printed invoice and the
 * QR payload are invisible to the eye and to a generic LLM, but deterministic
 * for us. Returns an empty array when no QR payload is present (the existing
 * QR_CODE_MISSING / QR_CODE_RECOMMENDED rules cover that case).
 */
export function runQrCrossChecks(
  invoice: ExtractedInvoice,
  qrPayload: string | undefined | null
): ValidationFlag[] {
  const flags: ValidationFlag[] = []
  if (!qrPayload?.trim()) return flags

  const result = parseZatcaQr(qrPayload)

  if (!result.ok) {
    flags.push({
      code: 'QR_MALFORMED',
      severity: 'error',
      message: `QR code could not be decoded (${result.error}) — it is not a valid ZATCA Base64 TLV payload`,
      messageAr: `تعذّر فك تشفير رمز QR (${result.error}) — ليس حمولة TLV صالحة بترميز Base64 وفق زاتكا`,
    })
    return flags
  }

  const qr = result.decoded

  // QR_TOTAL_MISMATCH — printed total vs. QR tag 4
  if (qr.total !== undefined && invoice.total !== undefined && invoice.total !== null) {
    if (!near(qr.total, invoice.total)) {
      flags.push({
        code: 'QR_TOTAL_MISMATCH',
        severity: 'error',
        message: `QR total (${qr.total.toFixed(2)}) does not match the invoice total (${invoice.total.toFixed(2)})`,
        messageAr: `إجمالي رمز QR (${qr.total.toFixed(2)}) لا يطابق إجمالي الفاتورة (${invoice.total.toFixed(2)})`,
      })
    }
  }

  // QR_VAT_MISMATCH — printed VAT vs. QR tag 5
  if (qr.vatTotal !== undefined && invoice.vatAmount !== undefined && invoice.vatAmount !== null) {
    if (!near(qr.vatTotal, invoice.vatAmount)) {
      flags.push({
        code: 'QR_VAT_MISMATCH',
        severity: 'error',
        message: `QR VAT total (${qr.vatTotal.toFixed(2)}) does not match the invoice VAT amount (${invoice.vatAmount.toFixed(2)})`,
        messageAr: `إجمالي ضريبة رمز QR (${qr.vatTotal.toFixed(2)}) لا يطابق مبلغ ضريبة الفاتورة (${invoice.vatAmount.toFixed(2)})`,
      })
    }
  }

  // QR_SELLER_VAT_MISMATCH — QR tag 2 vs. extracted seller VAT
  const qrVat = normalizeVat(qr.sellerVat)
  const invVat = normalizeVat(invoice.sellerVat)
  if (qrVat && invVat && qrVat !== invVat) {
    flags.push({
      code: 'QR_SELLER_VAT_MISMATCH',
      severity: 'error',
      message: `QR seller VAT number (${qr.sellerVat}) does not match the invoice seller VAT (${invoice.sellerVat})`,
      messageAr: `رقم ضريبة البائع في رمز QR (${qr.sellerVat}) لا يطابق رقم ضريبة البائع في الفاتورة (${invoice.sellerVat})`,
    })
  }

  // QR_SELLER_NAME_MISMATCH — QR tag 1 vs. extracted seller name (loose compare)
  if (qr.sellerName && invoice.sellerName) {
    const a = qr.sellerName.trim().toLowerCase()
    const b = invoice.sellerName.trim().toLowerCase()
    if (a && b && a !== b && !a.includes(b) && !b.includes(a)) {
      flags.push({
        code: 'QR_SELLER_NAME_MISMATCH',
        severity: 'warning',
        message: `QR seller name ("${qr.sellerName}") does not match the invoice seller name ("${invoice.sellerName}")`,
        messageAr: `اسم البائع في رمز QR ("${qr.sellerName}") لا يطابق اسم البائع في الفاتورة ("${invoice.sellerName}")`,
      })
    }
  }

  // QR_PHASE2_DETECTED — informational: cryptographic tags present
  if (qr.hasHash || qr.hasSignature || qr.hasPublicKey || qr.hasStampSignature) {
    flags.push({
      code: 'QR_PHASE2_DETECTED',
      severity: 'info',
      message: 'QR contains Phase 2 cryptographic fields (hash/signature/public key). Full signature verification is not performed here.',
      messageAr: 'يحتوي رمز QR على حقول تشفير المرحلة الثانية (التجزئة/التوقيع/المفتاح العام). لا يتم التحقق الكامل من التوقيع هنا.',
    })
  }

  return flags
}
