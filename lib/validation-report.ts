import type { ValidationResult } from '@/lib/validation-history'
import type { ExtractedInvoice, ValidationFlag } from '@/lib/zatca-rules'

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fieldRows(data: ExtractedInvoice, isRtl: boolean): string {
  const fields: [string, string, string | number | boolean | undefined][] = [
    ['البائع', 'Seller', data.sellerName],
    ['رقم ضريبة البائع', 'Seller VAT', data.sellerVat],
    ['المشتري', 'Buyer', data.buyerName],
    ['رقم ضريبة المشتري', 'Buyer VAT', data.buyerVat],
    ['رقم الفاتورة', 'Invoice No.', data.invoiceNumber],
    ['UUID', 'UUID', data.uuid],
    ['تاريخ الفاتورة', 'Invoice Date', data.invoiceDate],
    ['نوع الفاتورة', 'Invoice Type', data.invoiceType],
    ['الوعاء الضريبي', 'Subtotal (excl. VAT)', data.subtotal !== undefined ? `SAR ${data.subtotal.toFixed(2)}` : undefined],
    ['مبلغ الضريبة', 'VAT Amount', data.vatAmount !== undefined ? `SAR ${data.vatAmount.toFixed(2)}` : undefined],
    ['نسبة الضريبة', 'VAT Rate', data.vatRate !== undefined ? `${data.vatRate}%` : undefined],
    ['الإجمالي', 'Total (incl. VAT)', data.total !== undefined ? `SAR ${data.total.toFixed(2)}` : undefined],
    ['رمز QR', 'QR Code', data.hasQrCode ? (isRtl ? 'موجود' : 'Present') : (isRtl ? 'غير موجود' : 'Not detected')],
  ]
  return fields
    .filter(([, , v]) => v !== undefined)
    .map(
      ([ar, en, v]) =>
        `<tr><td class="k">${esc(isRtl ? ar : en)}</td><td class="v">${esc(v)}</td></tr>`
    )
    .join('')
}

function flagList(flags: ValidationFlag[], isRtl: boolean): string {
  if (flags.length === 0)
    return `<p class="ok">${isRtl ? 'لا توجد مشكلات.' : 'No issues found.'}</p>`
  const order = { error: 0, warning: 1, info: 2 } as const
  return flags
    .slice()
    .sort((a, b) => order[a.severity] - order[b.severity])
    .map((f) => {
      const msg = isRtl ? f.messageAr : f.message
      return `<div class="flag ${f.severity}"><span class="sev">${f.severity.toUpperCase()}</span><span>${esc(msg)}</span></div>`
    })
    .join('')
}

export function buildReportHtml(
  result: ValidationResult,
  fileName: string | null,
  language: string
): string {
  const isRtl = language === 'ar'
  const { extracted, flags, summary } = result
  const now = new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-GB')
  const t = {
    title: isRtl ? 'تقرير التحقق من الفاتورة الإلكترونية' : 'E-Invoice Compliance Report',
    sub: isRtl ? 'وفق متطلبات هيئة الزكاة والضريبة والجمارك (زاتكا)' : 'ZATCA e-invoicing compliance',
    file: isRtl ? 'الملف' : 'File',
    generated: isRtl ? 'تاريخ التقرير' : 'Generated',
    passed: isRtl ? 'اجتازت جميع الفحوصات' : 'Passed all checks',
    failed: isRtl ? 'توجد مشكلات تتطلب المراجعة' : 'Issues requiring attention',
    counts: isRtl
      ? `${summary.errors} خطأ · ${summary.warnings} تحذير · ${summary.infos} معلومة`
      : `${summary.errors} errors · ${summary.warnings} warnings · ${summary.infos} info`,
    data: isRtl ? 'البيانات المستخرجة' : 'Extracted Data',
    results: isRtl ? 'نتائج الفحص' : 'Validation Results',
    disclaimer: isRtl
      ? 'هذا التقرير للإرشاد العام فقط ولا يُغني عن مراجعة مستشار ضريبي معتمد. تحقق دائمًا من المتطلبات الحالية على zatca.gov.sa.'
      : 'This report is for general guidance only and does not substitute for a licensed tax advisor. Always verify current requirements at zatca.gov.sa.',
    brand: isRtl ? 'محاسب السعودية' : 'Saudi Accountant AI',
  }

  return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8" />
<title>${esc(t.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; color: #1f2933; margin: 0; padding: 32px; }
  .head { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #0D4F8C; padding-bottom: 16px; }
  .logo { width: 44px; height: 44px; border-radius: 50%; background: #C49A1A; color: #fff; font-weight: 700; font-size: 22px; display: flex; align-items: center; justify-content: center; }
  .head h1 { margin: 0; font-size: 18px; color: #0D4F8C; }
  .head p { margin: 2px 0 0; font-size: 12px; color: #6b7280; }
  .meta { font-size: 12px; color: #6b7280; margin: 14px 0; }
  .badge { padding: 14px 18px; border-radius: 12px; margin: 14px 0; }
  .badge.pass { background: #ecfdf5; border: 1px solid #a7f3d0; }
  .badge.fail { background: #fef2f2; border: 1px solid #fecaca; }
  .badge h2 { margin: 0; font-size: 16px; }
  .badge.pass h2 { color: #16a34a; }
  .badge.fail h2 { color: #dc2626; }
  .badge .counts { font-size: 13px; color: #4b5563; margin-top: 4px; }
  h3 { font-size: 13px; color: #0D4F8C; text-transform: uppercase; letter-spacing: .04em; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  td.k { color: #6b7280; width: 45%; }
  td.v { font-weight: 600; }
  .flag { display: flex; gap: 8px; align-items: flex-start; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f5f5f5; }
  .flag .sev { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
  .flag.error .sev { background: #fee2e2; color: #dc2626; }
  .flag.warning .sev { background: #fef3c7; color: #d97706; }
  .flag.info .sev { background: #dbeafe; color: #2563eb; }
  .ok { color: #16a34a; font-size: 13px; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="head">
    <div class="logo">م</div>
    <div>
      <h1>${esc(t.title)}</h1>
      <p>${esc(t.sub)} · ${esc(t.brand)}</p>
    </div>
  </div>

  <div class="meta">
    ${fileName ? `${esc(t.file)}: <b>${esc(fileName)}</b> &nbsp;·&nbsp; ` : ''}${esc(t.generated)}: ${esc(now)}
  </div>

  <div class="badge ${summary.passed ? 'pass' : 'fail'}">
    <h2>${summary.passed ? esc(t.passed) : esc(t.failed)}</h2>
    <div class="counts">${esc(t.counts)}</div>
  </div>

  <h3>${esc(t.data)}</h3>
  <table>${fieldRows(extracted, isRtl)}</table>

  <h3>${esc(t.results)}</h3>
  ${flagList(flags, isRtl)}

  <div class="footer">${esc(t.disclaimer)}</div>
</body>
</html>`
}

/** Opens the report in a new window and triggers the browser's print/save-as-PDF. */
export function openReport(
  result: ValidationResult,
  fileName: string | null,
  language: string
): void {
  const html = buildReportHtml(result, fileName, language)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  // Give the new document a tick to render Arabic glyphs before printing.
  setTimeout(() => win.print(), 400)
}
