import { describe, it, expect } from 'vitest'
import { runZatcaRules, type ExtractedInvoice } from '@/lib/zatca-rules'

/** A fully valid B2C simplified invoice (no buyer VAT, has QR). */
const validB2C: ExtractedInvoice = {
  sellerName: 'ACME Trading Co',
  sellerVat: '300000000000003',
  invoiceNumber: 'INV-1001',
  uuid: '3a1f8e2c-1b2d-4c3e-8a9b-0c1d2e3f4a5b',
  invoiceDate: '2024-03-15',
  invoiceType: 'B2C',
  subtotal: 100,
  vatAmount: 15,
  vatRate: 15,
  total: 115,
  hasQrCode: true,
}

const codes = (inv: ExtractedInvoice) => runZatcaRules(inv).map((f) => f.code)

describe('runZatcaRules — happy path', () => {
  it('produces no flags for a fully valid B2C invoice', () => {
    expect(runZatcaRules(validB2C)).toEqual([])
  })
})

describe('runZatcaRules — seller', () => {
  it('flags missing seller name', () => {
    expect(codes({ ...validB2C, sellerName: undefined })).toContain('SELLER_NAME_MISSING')
  })

  it('flags missing seller VAT', () => {
    expect(codes({ ...validB2C, sellerVat: undefined })).toContain('SELLER_VAT_MISSING')
  })

  it('flags a malformed seller VAT (wrong format)', () => {
    expect(codes({ ...validB2C, sellerVat: '12345' })).toContain('SELLER_VAT_INVALID')
  })

  it('accepts a valid 15-digit VAT starting and ending with 3', () => {
    expect(codes({ ...validB2C, sellerVat: '300000000000003' })).not.toContain('SELLER_VAT_INVALID')
  })
})

describe('runZatcaRules — buyer / B2B', () => {
  it('requires buyer name on B2B invoices', () => {
    const b2b: ExtractedInvoice = { ...validB2C, invoiceType: 'B2B', buyerVat: '311111111111113' }
    expect(codes(b2b)).toContain('BUYER_NAME_MISSING')
  })

  it('does not require buyer name on B2C invoices', () => {
    expect(codes(validB2C)).not.toContain('BUYER_NAME_MISSING')
  })

  it('warns on a malformed buyer VAT', () => {
    expect(codes({ ...validB2C, buyerVat: 'XX' })).toContain('BUYER_VAT_INVALID')
  })
})

describe('runZatcaRules — meta fields', () => {
  it('flags missing invoice number', () => {
    expect(codes({ ...validB2C, invoiceNumber: undefined })).toContain('INVOICE_NUMBER_MISSING')
  })

  it('flags missing UUID', () => {
    expect(codes({ ...validB2C, uuid: undefined })).toContain('UUID_MISSING')
  })

  it('warns on a malformed UUID', () => {
    expect(codes({ ...validB2C, uuid: 'not-a-uuid' })).toContain('UUID_INVALID')
  })

  it('flags missing date', () => {
    expect(codes({ ...validB2C, invoiceDate: undefined })).toContain('DATE_MISSING')
  })

  it('warns on a non-ISO date format', () => {
    expect(codes({ ...validB2C, invoiceDate: '15/03/2024' })).toContain('DATE_FORMAT_INVALID')
  })
})

describe('runZatcaRules — VAT math', () => {
  it('flags an incorrect VAT rate (e.g. 5%)', () => {
    expect(codes({ ...validB2C, vatRate: 5 })).toContain('VAT_RATE_INCORRECT')
  })

  it('flags a VAT amount that is not subtotal × 15%', () => {
    expect(codes({ ...validB2C, vatAmount: 10, total: 110 })).toContain('VAT_MATH_ERROR')
  })

  it('flags a total that is not subtotal + VAT', () => {
    expect(codes({ ...validB2C, total: 999 })).toContain('TOTAL_MATH_ERROR')
  })

  it('tolerates sub-cent rounding on VAT', () => {
    expect(codes({ ...validB2C, vatAmount: 15.02, total: 115.02 })).not.toContain('VAT_MATH_ERROR')
  })

  it('warns when amounts are partially present', () => {
    expect(codes({ ...validB2C, vatAmount: undefined, total: undefined })).toContain('AMOUNTS_INCOMPLETE')
  })
})

describe('runZatcaRules — QR presence', () => {
  it('errors on missing QR for B2B', () => {
    const b2b: ExtractedInvoice = {
      ...validB2C,
      invoiceType: 'B2B',
      buyerName: 'Buyer Co',
      buyerVat: '311111111111113',
      hasQrCode: false,
    }
    expect(codes(b2b)).toContain('QR_CODE_MISSING')
  })

  it('warns on missing QR for B2C', () => {
    expect(codes({ ...validB2C, hasQrCode: false })).toContain('QR_CODE_RECOMMENDED')
  })
})

describe('runZatcaRules — line items', () => {
  it('flags a line total that is not qty × unit price', () => {
    const inv: ExtractedInvoice = {
      ...validB2C,
      lines: [{ description: 'Widget', quantity: 2, unitPrice: 10, lineTotal: 25 }],
    }
    expect(codes(inv)).toContain('LINE_TOTAL_MISMATCH')
  })

  it('flags a line VAT that is not lineTotal × rate', () => {
    const inv: ExtractedInvoice = {
      ...validB2C,
      lines: [{ description: 'Widget', lineTotal: 100, vatAmount: 5, vatRate: 15 }],
    }
    expect(codes(inv)).toContain('LINE_VAT_MISMATCH')
  })

  it('accepts correct line items', () => {
    const inv: ExtractedInvoice = {
      ...validB2C,
      lines: [{ description: 'Widget', quantity: 2, unitPrice: 50, lineTotal: 100, vatAmount: 15, vatRate: 15 }],
    }
    expect(codes(inv)).not.toContain('LINE_TOTAL_MISMATCH')
    expect(codes(inv)).not.toContain('LINE_VAT_MISMATCH')
  })
})
