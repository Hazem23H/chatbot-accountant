import { describe, it, expect } from 'vitest'
import { parseZatcaQr, runQrCrossChecks } from '@/lib/zatca-qr'
import type { ExtractedInvoice } from '@/lib/zatca-rules'

// --- helpers -------------------------------------------------------------

/** Build a ZATCA Base64 TLV payload from a list of [tag, value] pairs. */
function buildQr(tags: Array<[number, string | Buffer]>): string {
  const chunks: Buffer[] = []
  for (const [tag, value] of tags) {
    const valueBuf = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8')
    chunks.push(Buffer.from([tag, valueBuf.length]), valueBuf)
  }
  return Buffer.concat(chunks).toString('base64')
}

/** A well-formed Phase 1 invoice + matching QR. */
const phase1Qr = buildQr([
  [1, 'ACME Trading Co'],
  [2, '300000000000003'],
  [3, '2024-03-15T10:00:00Z'],
  [4, '115.00'],
  [5, '15.00'],
])

const matchingInvoice: ExtractedInvoice = {
  sellerName: 'ACME Trading Co',
  sellerVat: '300000000000003',
  total: 115.0,
  vatAmount: 15.0,
}

// --- parseZatcaQr --------------------------------------------------------

describe('parseZatcaQr', () => {
  it('decodes a Phase 1 TLV payload', () => {
    const res = parseZatcaQr(phase1Qr)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.decoded.sellerName).toBe('ACME Trading Co')
    expect(res.decoded.sellerVat).toBe('300000000000003')
    expect(res.decoded.timestamp).toBe('2024-03-15T10:00:00Z')
    expect(res.decoded.total).toBe(115)
    expect(res.decoded.vatTotal).toBe(15)
    expect(res.decoded.hasSignature).toBe(false)
  })

  it('handles UTF-8 Arabic seller names', () => {
    const qr = buildQr([[1, 'شركة الاختبار'], [4, '50.00']])
    const res = parseZatcaQr(qr)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.decoded.sellerName).toBe('شركة الاختبار')
  })

  it('detects Phase 2 cryptographic tags', () => {
    const qr = buildQr([
      [1, 'ACME'],
      [4, '115.00'],
      [5, '15.00'],
      [6, Buffer.alloc(32, 1)], // hash
      [7, Buffer.alloc(64, 2)], // signature
      [8, Buffer.alloc(70, 3)], // public key
    ])
    const res = parseZatcaQr(qr)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.decoded.hasHash).toBe(true)
    expect(res.decoded.hasSignature).toBe(true)
    expect(res.decoded.hasPublicKey).toBe(true)
    expect(res.decoded.hasStampSignature).toBe(false)
  })

  it('rejects empty input', () => {
    expect(parseZatcaQr('')).toEqual({ ok: false, error: 'EMPTY' })
    expect(parseZatcaQr(undefined)).toEqual({ ok: false, error: 'EMPTY' })
    expect(parseZatcaQr('   ')).toEqual({ ok: false, error: 'EMPTY' })
  })

  it('rejects non-base64 input', () => {
    const res = parseZatcaQr('not valid base64 !!!')
    expect(res).toEqual({ ok: false, error: 'BAD_BASE64' })
  })

  it('rejects truncated TLV (length runs past buffer)', () => {
    // tag 1, claims length 99 but only 2 value bytes follow
    const truncated = Buffer.from([1, 99, 65, 66]).toString('base64')
    expect(parseZatcaQr(truncated)).toEqual({ ok: false, error: 'MALFORMED_TLV' })
  })
})

// --- runQrCrossChecks ----------------------------------------------------

describe('runQrCrossChecks', () => {
  it('returns no flags when QR matches the invoice', () => {
    const flags = runQrCrossChecks(matchingInvoice, phase1Qr)
    expect(flags).toEqual([])
  })

  it('returns no flags when no QR payload is present', () => {
    expect(runQrCrossChecks(matchingInvoice, undefined)).toEqual([])
    expect(runQrCrossChecks(matchingInvoice, '')).toEqual([])
  })

  it('flags a total mismatch (the fraud catch)', () => {
    const invoice = { ...matchingInvoice, total: 150.0 }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    expect(flags.map((f) => f.code)).toContain('QR_TOTAL_MISMATCH')
    expect(flags.find((f) => f.code === 'QR_TOTAL_MISMATCH')?.severity).toBe('error')
  })

  it('flags a VAT mismatch', () => {
    const invoice = { ...matchingInvoice, vatAmount: 22.5 }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    expect(flags.map((f) => f.code)).toContain('QR_VAT_MISMATCH')
  })

  it('flags a seller VAT mismatch', () => {
    const invoice = { ...matchingInvoice, sellerVat: '399999999999993' }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    expect(flags.map((f) => f.code)).toContain('QR_SELLER_VAT_MISMATCH')
  })

  it('ignores whitespace differences in VAT numbers', () => {
    const invoice = { ...matchingInvoice, sellerVat: '300 000 000 000 003' }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    expect(flags.map((f) => f.code)).not.toContain('QR_SELLER_VAT_MISMATCH')
  })

  it('warns (not errors) on a seller name mismatch', () => {
    const invoice = { ...matchingInvoice, sellerName: 'Totally Different Co' }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    const f = flags.find((x) => x.code === 'QR_SELLER_NAME_MISMATCH')
    expect(f?.severity).toBe('warning')
  })

  it('does not flag seller name when one contains the other', () => {
    const invoice = { ...matchingInvoice, sellerName: 'ACME Trading' }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    expect(flags.map((f) => f.code)).not.toContain('QR_SELLER_NAME_MISMATCH')
  })

  it('emits QR_MALFORMED for an undecodable payload', () => {
    const flags = runQrCrossChecks(matchingInvoice, 'not base64 !!!')
    expect(flags.map((f) => f.code)).toEqual(['QR_MALFORMED'])
  })

  it('emits an info flag when Phase 2 tags are present', () => {
    const qr = buildQr([
      [1, 'ACME Trading Co'],
      [2, '300000000000003'],
      [4, '115.00'],
      [5, '15.00'],
      [7, Buffer.alloc(64, 2)],
    ])
    const flags = runQrCrossChecks(matchingInvoice, qr)
    const f = flags.find((x) => x.code === 'QR_PHASE2_DETECTED')
    expect(f?.severity).toBe('info')
  })

  it('tolerates sub-cent rounding differences', () => {
    const invoice = { ...matchingInvoice, total: 115.009 }
    const flags = runQrCrossChecks(invoice, phase1Qr)
    expect(flags.map((f) => f.code)).not.toContain('QR_TOTAL_MISMATCH')
  })
})
