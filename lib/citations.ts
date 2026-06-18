// Curated, in-repo library of Saudi tax / ZATCA reference sources.
// The chat model may ONLY cite by these ids — it cannot invent links — so
// every rendered citation points to a known-good official reference.
//
// Every URL below was verified live against zatca.gov.sa (June 2026) and the
// facts in each `topic`/title were cross-checked against the same official
// pages. When updating, re-verify the URL resolves and the rate/date is current.

export interface Citation {
  id: string
  titleAr: string
  titleEn: string
  /** Short hint (English) describing when this source applies — used in the prompt. */
  topic: string
  url: string
}

const RR = 'https://zatca.gov.sa/en/RulesRegulations/Taxes/Pages'
const EINV = 'https://zatca.gov.sa/en/E-Invoicing'

export const CITATIONS: Citation[] = [
  // ── VAT ──────────────────────────────────────────────────────────────────
  {
    id: 'vat-standard-rate',
    titleAr: 'اللائحة التنفيذية لضريبة القيمة المضافة — النسبة 15%',
    titleEn: 'VAT Implementing Regulations — 15% standard rate',
    topic: 'the 15% standard VAT rate (effective 1 July 2020) and zero-rated/exempt supplies',
    url: `${RR}/VATImplementingRegulations.aspx`,
  },
  {
    id: 'vat-registration',
    titleAr: 'التسجيل في ضريبة القيمة المضافة — حدود التسجيل',
    titleEn: 'VAT registration thresholds',
    topic: 'mandatory VAT registration at SAR 375,000 and voluntary at SAR 187,500 of annual taxable supplies',
    url: `${RR}/VATImplementingRegulations.aspx`,
  },
  {
    id: 'tax-invoice-requirements',
    titleAr: 'متطلبات الفاتورة الضريبية (اللائحة التنفيذية)',
    titleEn: 'Tax invoice required fields',
    topic: 'mandatory tax-invoice fields under the VAT Implementing Regulations (seller VAT number, sequential number, date, taxable amount, VAT)',
    url: `${RR}/VATImplementingRegulations.aspx`,
  },

  // ── E-Invoicing (Fatoorah) ────────────────────────────────────────────────
  {
    id: 'einvoicing-overview',
    titleAr: 'الفوترة الإلكترونية (فاتورة) — نظرة عامة',
    titleEn: 'E-Invoicing (Fatoorah) overview',
    topic: 'general e-invoicing obligations in Saudi Arabia',
    url: `${EINV}/Pages/default.aspx`,
  },
  {
    id: 'einvoicing-phase1',
    titleAr: 'الفوترة الإلكترونية — المرحلة الأولى (الإصدار)',
    titleEn: 'E-Invoicing Phase 1 (Generation)',
    topic: 'Phase 1 generation requirements (enforceable since 4 December 2021), including QR on simplified invoices',
    url: `${EINV}/Introduction/Pages/Roll-out-phases.aspx`,
  },
  {
    id: 'einvoicing-phase2',
    titleAr: 'الفوترة الإلكترونية — المرحلة الثانية (الربط والتكامل)',
    titleEn: 'E-Invoicing Phase 2 (Integration)',
    topic: 'Phase 2 integration (from 1 January 2023, rolled out in waves): UUID, cryptographic stamp, XML/UBL, clearance/reporting',
    url: `${EINV}/Introduction/Pages/Roll-out-phases.aspx`,
  },
  {
    id: 'einvoicing-qr',
    titleAr: 'متطلبات رمز الاستجابة السريعة (QR) — الأدلة الفنية',
    titleEn: 'QR code requirement (technical guidelines)',
    topic: 'QR code (Base64 TLV) requirement on simplified (B2C) and e-invoices',
    url: `${EINV}/Introduction/Guidelines/Pages/default.aspx`,
  },

  // ── Other taxes ────────────────────────────────────────────────────────────
  {
    id: 'zakat',
    titleAr: 'اللائحة التنفيذية لجباية الزكاة — 2.5%',
    titleEn: 'Zakat Collection Regulations — 2.5%',
    topic: 'zakat at 2.5% of the zakat base for the Hijri year, for Saudi/GCC-owned entities',
    url: `${RR}/ZakatRegulations.aspx`,
  },
  {
    id: 'income-tax',
    titleAr: 'نظام ضريبة الدخل — ضريبة الشركات 20%',
    titleEn: 'Income Tax Law — 20% corporate tax',
    topic: 'corporate income tax at 20% on the non-Saudi/foreign-owned share of a company',
    url: `${RR}/IncomeTaxlaw.aspx`,
  },
  {
    id: 'withholding-tax',
    titleAr: 'ضريبة الاستقطاع (نظام ضريبة الدخل)',
    titleEn: 'Withholding tax (Income Tax Law)',
    topic: 'withholding tax on payments to non-residents (e.g. 5% dividends/interest/rent, 15% royalties, 20% management fees)',
    url: `${RR}/IncomeTaxlaw.aspx`,
  },
  {
    id: 'excise-tax',
    titleAr: 'الضريبة الانتقائية',
    titleEn: 'Excise tax',
    topic: 'excise tax: 100% on tobacco and energy drinks, 50% on soft and sweetened drinks',
    url: `${RR}/excise-tax.aspx`,
  },
  {
    id: 'rett',
    titleAr: 'ضريبة التصرفات العقارية — 5%',
    titleEn: 'Real Estate Transaction Tax (RETT) — 5%',
    topic: 'the 5% real estate transaction tax (current law effective 10 April 2025) and its exemptions',
    url: `${RR}/RETTRegulation.aspx`,
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
