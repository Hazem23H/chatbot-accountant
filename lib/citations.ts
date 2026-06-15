// Curated, in-repo library of Saudi tax / ZATCA reference sources.
// The chat model may ONLY cite by these ids — it cannot invent links — so
// every rendered citation points to a known-good official reference.

export interface Citation {
  id: string
  titleAr: string
  titleEn: string
  /** Short hint (English) describing when this source applies — used in the prompt. */
  topic: string
  url: string
}

const PORTAL = 'https://zatca.gov.sa/en'

export const CITATIONS: Citation[] = [
  {
    id: 'vat-standard-rate',
    titleAr: 'نظام ضريبة القيمة المضافة — النسبة القياسية 15%',
    titleEn: 'VAT — standard rate of 15%',
    topic: 'the 15% standard VAT rate (effective July 2020)',
    url: `${PORTAL}/HelpCenter/guidelines/Pages/default.aspx`,
  },
  {
    id: 'vat-registration',
    titleAr: 'التسجيل في ضريبة القيمة المضافة — حدود التسجيل',
    titleEn: 'VAT registration thresholds',
    topic: 'mandatory/voluntary VAT registration thresholds (SAR 375k / 187.5k)',
    url: `${PORTAL}/HelpCenter/guidelines/Pages/default.aspx`,
  },
  {
    id: 'tax-invoice-requirements',
    titleAr: 'متطلبات الفاتورة الضريبية',
    titleEn: 'Tax invoice required fields',
    topic: 'mandatory fields on a tax invoice (seller VAT, sequential number, date, totals)',
    url: `${PORTAL}/E-Invoicing/Pages/default.aspx`,
  },
  {
    id: 'einvoicing-overview',
    titleAr: 'الفوترة الإلكترونية (فاتورة) — نظرة عامة',
    titleEn: 'E-Invoicing (Fatoorah) overview',
    topic: 'general e-invoicing obligations in Saudi Arabia',
    url: `${PORTAL}/E-Invoicing/Pages/default.aspx`,
  },
  {
    id: 'einvoicing-phase1',
    titleAr: 'الفوترة الإلكترونية — المرحلة الأولى (الإصدار)',
    titleEn: 'E-Invoicing Phase 1 (Generation)',
    topic: 'Phase 1 generation requirements (since Dec 2021), QR on simplified invoices',
    url: `${PORTAL}/E-Invoicing/Pages/default.aspx`,
  },
  {
    id: 'einvoicing-phase2',
    titleAr: 'الفوترة الإلكترونية — المرحلة الثانية (الربط والتكامل)',
    titleEn: 'E-Invoicing Phase 2 (Integration)',
    topic: 'Phase 2 integration: UUID, cryptographic stamp, XML/UBL, clearance/reporting',
    url: `${PORTAL}/E-Invoicing/Introduction/Pages/Integration-Phase.aspx`,
  },
  {
    id: 'einvoicing-qr',
    titleAr: 'متطلبات رمز الاستجابة السريعة (QR)',
    titleEn: 'QR code requirement',
    topic: 'QR code requirement on simplified (B2C) and e-invoices, TLV fields',
    url: `${PORTAL}/E-Invoicing/Pages/default.aspx`,
  },
  {
    id: 'zakat',
    titleAr: 'الزكاة — اللائحة التنفيذية',
    titleEn: 'Zakat implementing regulations',
    topic: 'zakat calculation and obligations for Saudi/GCC entities',
    url: `${PORTAL}/HelpCenter/guidelines/Pages/default.aspx`,
  },
  {
    id: 'withholding-tax',
    titleAr: 'ضريبة الاستقطاع',
    titleEn: 'Withholding tax',
    topic: 'withholding tax on payments to non-residents and applicable rates',
    url: `${PORTAL}/HelpCenter/guidelines/Pages/default.aspx`,
  },
  {
    id: 'rett',
    titleAr: 'ضريبة التصرفات العقارية',
    titleEn: 'Real Estate Transaction Tax (RETT)',
    topic: 'the 5% real estate transaction tax and exemptions',
    url: `${PORTAL}/HelpCenter/guidelines/Pages/default.aspx`,
  },
]

const byId = new Map(CITATIONS.map((c) => [c.id, c]))

/** Compact list injected into the system prompt so the model knows valid ids. */
export function citationsForPrompt(): string {
  return CITATIONS.map((c) => `- ${c.id}: ${c.topic}`).join('\n')
}

/** Resolve ids to known citations (deduped; unknown ids dropped). */
export function getCitations(ids: string[]): Citation[] {
  const seen = new Set<string>()
  const out: Citation[] = []
  for (const raw of ids) {
    const id = raw.trim()
    const c = byId.get(id)
    if (c && !seen.has(id)) {
      seen.add(id)
      out.push(c)
    }
  }
  return out
}

const SOURCES_RE = /<sources>([\s\S]*?)<\/sources>/i

/**
 * Split an assistant message into displayable text + cited ids. Tolerates a
 * partial/unclosed tag while streaming by hiding everything from `<sources`
 * onward until the closing tag arrives.
 */
export function parseCitations(content: string): { text: string; ids: string[] } {
  const match = content.match(SOURCES_RE)
  if (match) {
    const ids = match[1].split(',').map((s) => s.trim()).filter(Boolean)
    const text = content.replace(SOURCES_RE, '').trimEnd()
    return { text, ids }
  }
  // Closing tag not here yet — strip a dangling (possibly partial) opener at
  // the end so it never flashes while streaming (e.g. "<", "<sourc", "<sources>").
  const lt = content.lastIndexOf('<')
  if (lt !== -1 && '<sources>'.startsWith(content.slice(lt).toLowerCase())) {
    return { text: content.slice(0, lt).trimEnd(), ids: [] }
  }
  return { text: content, ids: [] }
}
