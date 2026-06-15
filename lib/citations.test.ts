import { describe, it, expect } from 'vitest'
import { parseCitations, getCitations, CITATIONS } from '@/lib/citations'

describe('parseCitations', () => {
  it('extracts ids and strips the tag from the text', () => {
    const { text, ids } = parseCitations(
      'The standard VAT rate is 15%.\n<sources>vat-standard-rate, einvoicing-qr</sources>'
    )
    expect(text).toBe('The standard VAT rate is 15%.')
    expect(ids).toEqual(['vat-standard-rate', 'einvoicing-qr'])
  })

  it('returns the text unchanged when there is no tag', () => {
    const { text, ids } = parseCitations('Just a greeting.')
    expect(text).toBe('Just a greeting.')
    expect(ids).toEqual([])
  })

  it('hides a dangling opener while streaming (no closing tag yet)', () => {
    const { text, ids } = parseCitations('VAT is 15%.\n<sourc')
    expect(text).toBe('VAT is 15%.')
    expect(ids).toEqual([])
  })
})

describe('getCitations', () => {
  it('resolves known ids, drops unknown ones, and dedupes', () => {
    const out = getCitations(['vat-standard-rate', 'not-a-real-id', 'vat-standard-rate'])
    expect(out.map((c) => c.id)).toEqual(['vat-standard-rate'])
  })

  it('every curated citation has a title and url', () => {
    for (const c of CITATIONS) {
      expect(c.titleAr.length).toBeGreaterThan(0)
      expect(c.titleEn.length).toBeGreaterThan(0)
      expect(c.url).toMatch(/^https:\/\/zatca\.gov\.sa/)
    }
  })
})
