'use client'

import { useState, useCallback, useEffect, useMemo, DragEvent } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  RotateCcw,
  Download,
  Sparkles,
  Pencil,
} from 'lucide-react'
import { runZatcaRules, isAiFlag, type ExtractedInvoice, type ValidationFlag } from '@/lib/zatca-rules'
import { runQrCrossChecks } from '@/lib/zatca-qr'
import { saveValidation, type ValidationResult } from '@/lib/validation-history'
import { openReport } from '@/lib/validation-report'
import { validateInvoiceFile, ACCEPTED_TYPES, MAX_BYTES } from '@/lib/validate-client'
import { scanQrFromFile } from '@/lib/qr-scan'

interface InvoiceValidatorProps {
  language?: 'ar' | 'en'
  isAuthenticated?: boolean
  clientId?: string | null
  initialResult?: ValidationResult | null
  initialFileName?: string | null
  initialFileUrl?: string | null
  onValidationComplete?: (result: ValidationResult) => void
  onSaved?: () => void
}

const IMG_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg']

/** Decide preview kind from a filename when no in-memory File is available. */
function kindFromName(name: string | null): 'img' | 'pdf' | 'other' {
  const ext = name?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (IMG_EXTS.includes(ext)) return 'img'
  return 'other'
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function IssueCard({ flag, language }: { flag: ValidationFlag; language: string }) {
  const isAr = language === 'ar'
  const msg = isAr ? flag.messageAr : flag.message
  const ai = isAiFlag(flag)

  const tone =
    flag.severity === 'error'
      ? { border: 'border-s-destructive', icon: <AlertCircle size={15} className="text-destructive" /> }
      : flag.severity === 'warning'
        ? { border: 'border-s-warning', icon: <AlertTriangle size={15} className="text-warning" /> }
        : { border: 'border-s-primary', icon: <Info size={15} className="text-primary" /> }

  return (
    <div className={`border border-border border-s-[3px] ${tone.border} rounded-xl px-3.5 py-3 flex items-start gap-2.5`}>
      <span className="shrink-0 mt-0.5">{tone.icon}</span>
      <span className="text-sm leading-relaxed text-foreground flex-1">{msg}</span>
      {ai && (
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5 mt-0.5">
          <Sparkles size={10} />
          {isAr ? 'تحليل ذكي' : 'AI'}
        </span>
      )}
    </div>
  )
}

function ExtractedGrid({ data, language }: { data: ExtractedInvoice; language: string }) {
  const isAr = language === 'ar'
  const fields: [string, string, string | number | boolean | undefined][] = [
    ['البائع', 'Seller', data.sellerName],
    ['رقم ضريبة البائع', 'Seller VAT', data.sellerVat],
    ['المشتري', 'Buyer', data.buyerName],
    ['رقم ضريبة المشتري', 'Buyer VAT', data.buyerVat],
    ['رقم الفاتورة', 'Invoice No.', data.invoiceNumber],
    ['UUID', 'UUID', data.uuid],
    ['تاريخ الفاتورة', 'Invoice Date', data.invoiceDate],
    ['نوع الفاتورة', 'Invoice Type', data.invoiceType],
    ['المجموع قبل الخصم', 'Subtotal (excl. VAT)', data.subtotal !== undefined ? `SAR ${data.subtotal.toFixed(2)}` : undefined],
    ['الخصم', 'Discount', data.discountAmount !== undefined ? `SAR ${data.discountAmount.toFixed(2)}` : undefined],
    ['مبلغ الضريبة', 'VAT Amount', data.vatAmount !== undefined ? `SAR ${data.vatAmount.toFixed(2)}` : undefined],
    ['نسبة الضريبة', 'VAT Rate', data.vatRate !== undefined ? `${data.vatRate}%` : undefined],
    ['الإجمالي', 'Total (incl. VAT)', data.total !== undefined ? `SAR ${data.total.toFixed(2)}` : undefined],
    ['رمز QR', 'QR Code', data.hasQrCode ? (isAr ? 'موجود' : 'Present') : (isAr ? 'غير موجود' : 'Not detected')],
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map(([labelAr, labelEn, value]) =>
        value !== undefined ? (
          <div key={labelEn} className="bg-muted rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">{isAr ? labelAr : labelEn}</p>
            <p className="text-sm font-medium text-foreground break-all">{String(value)}</p>
          </div>
        ) : null
      )}
    </div>
  )
}

// Editable subset of the extracted fields (text + numeric). QR/lines are derived
// from the file and stay read-only.
const FIELD_DEFS: { key: keyof ExtractedInvoice; ar: string; en: string; numeric?: boolean }[] = [
  { key: 'sellerName', ar: 'البائع', en: 'Seller' },
  { key: 'sellerVat', ar: 'رقم ضريبة البائع', en: 'Seller VAT' },
  { key: 'buyerName', ar: 'المشتري', en: 'Buyer' },
  { key: 'buyerVat', ar: 'رقم ضريبة المشتري', en: 'Buyer VAT' },
  { key: 'invoiceNumber', ar: 'رقم الفاتورة', en: 'Invoice No.' },
  { key: 'uuid', ar: 'UUID', en: 'UUID' },
  { key: 'invoiceDate', ar: 'تاريخ الفاتورة', en: 'Invoice Date' },
  { key: 'invoiceType', ar: 'نوع الفاتورة', en: 'Invoice Type' },
  { key: 'subtotal', ar: 'المجموع قبل الخصم', en: 'Subtotal (excl. VAT)', numeric: true },
  { key: 'discountAmount', ar: 'الخصم', en: 'Discount', numeric: true },
  { key: 'vatAmount', ar: 'مبلغ الضريبة', en: 'VAT Amount', numeric: true },
  { key: 'vatRate', ar: 'نسبة الضريبة', en: 'VAT Rate', numeric: true },
  { key: 'total', ar: 'الإجمالي', en: 'Total (incl. VAT)', numeric: true },
]

type Draft = Record<string, string>

function draftFromInvoice(data: ExtractedInvoice): Draft {
  const d: Draft = {}
  for (const { key } of FIELD_DEFS) {
    const v = data[key]
    d[key] = v === undefined || v === null ? '' : String(v)
  }
  return d
}

/** Merge the edited draft back onto the original invoice (preserving lines/QR). */
function invoiceFromDraft(base: ExtractedInvoice, draft: Draft): ExtractedInvoice {
  const out: ExtractedInvoice = { ...base }
  for (const { key, numeric } of FIELD_DEFS) {
    const s = (draft[key] ?? '').trim()
    if (s === '') {
      delete out[key]
    } else if (numeric) {
      const n = parseFloat(s)
      if (Number.isFinite(n)) (out[key] as number) = n
      else delete out[key]
    } else {
      ;(out[key] as string) = s
    }
  }
  return out
}

function EditableGrid({
  draft,
  language,
  hasQr,
  qrScanned,
  qrMatched,
  onChange,
}: {
  draft: Draft
  language: string
  hasQr: boolean
  qrScanned: boolean
  qrMatched: boolean
  onChange: (key: string, value: string) => void
}) {
  const isAr = language === 'ar'

  // QR cell content reflects whether we actually decoded the barcode and
  // whether its payload matches the printed invoice.
  let qrText: string
  let qrClass = 'text-foreground'
  let qrIcon: React.ReactNode = null
  if (!hasQr) {
    qrText = isAr ? 'غير موجود' : 'Not detected'
  } else if (!qrScanned) {
    qrText = isAr ? 'موجود' : 'Present'
  } else if (qrMatched) {
    qrText = isAr ? 'مُتحقَّق — يطابق الفاتورة' : 'Verified — matches invoice'
    qrClass = 'text-primary'
    qrIcon = <CheckCircle size={13} className="text-primary shrink-0" />
  } else {
    qrText = isAr ? 'ممسوح — لا يطابق' : 'Scanned — mismatch'
    qrClass = 'text-warning'
    qrIcon = <AlertTriangle size={13} className="text-warning shrink-0" />
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELD_DEFS.map(({ key, ar, en, numeric }) => (
        <label
          key={key}
          className="bg-muted rounded-lg px-3 py-2 block cursor-text focus-within:ring-2 focus-within:ring-ring/40 transition-shadow"
        >
          <span className="text-xs text-muted-foreground">{isAr ? ar : en}</span>
          <input
            value={draft[key] ?? ''}
            inputMode={numeric ? 'decimal' : undefined}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder="—"
            dir={numeric ? 'ltr' : undefined}
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none mt-0.5 placeholder:text-muted-foreground/50"
          />
        </label>
      ))}
      {/* QR presence is read-only — it reflects the actual document. */}
      <div className="bg-muted rounded-lg px-3 py-2">
        <p className="text-xs text-muted-foreground">{isAr ? 'رمز QR' : 'QR Code'}</p>
        <p className={`text-sm font-medium mt-0.5 flex items-center gap-1.5 ${qrClass}`}>
          {qrIcon}
          {qrText}
        </p>
      </div>
    </div>
  )
}

export function InvoiceValidator({
  language = 'ar',
  isAuthenticated = false,
  clientId = null,
  initialResult = null,
  initialFileName = null,
  initialFileUrl = null,
  onValidationComplete,
  onSaved,
}: InvoiceValidatorProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'results'>(
    initialResult ? 'results' : 'idle'
  )
  const [result, setResult] = useState<ValidationResult | null>(initialResult)
  const [fileName, setFileName] = useState<string | null>(initialFileName)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Editable extracted fields. `draft` holds raw strings so typing decimals works;
  // `edited` flips on once the user changes anything.
  const [draft, setDraft] = useState<Draft>(() =>
    initialResult ? draftFromInvoice(initialResult.extracted) : {}
  )
  const [edited, setEdited] = useState(false)

  const isRtl = language === 'ar'

  // Object URL for the invoice preview pane; revoked when the file changes.
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

  // Reset the editable draft whenever a fresh result loads (new validation or
  // reopened saved one).
  useEffect(() => {
    if (result) {
      setDraft(draftFromInvoice(result.extracted))
      setEdited(false)
    }
  }, [result])

  // The invoice as currently edited, and the locally-recomputed deterministic
  // flags. Until the user edits, we trust the server's flags verbatim (they were
  // produced by these same functions plus the AI pass).
  const editedExtracted = useMemo(
    () => (result ? invoiceFromDraft(result.extracted, draft) : null),
    [result, draft]
  )

  const displayFlags = useMemo<ValidationFlag[]>(() => {
    if (!result) return []
    if (!edited || !editedExtracted) return result.flags
    // Phase is a property of the document (its QR), not of the editable fields,
    // so derive it once from the server's result.
    const isPhase2 = result.flags.some((f) => f.code === 'QR_PHASE2_DETECTED')
    const ruleFlags = [
      ...runZatcaRules(editedExtracted, { isPhase2 }),
      ...runQrCrossChecks(editedExtracted, editedExtracted.qrCode),
    ].map((f) => ({ ...f, source: 'rule' as const }))
    const aiFlags = result.flags.filter(isAiFlag)
    return [...ruleFlags, ...aiFlags]
  }, [result, edited, editedExtracted])

  const liveSummary = useMemo(() => {
    const errors = displayFlags.filter((f) => f.severity === 'error').length
    const warnings = displayFlags.filter((f) => f.severity === 'warning').length
    const infos = displayFlags.filter((f) => f.severity === 'info').length
    return { total: displayFlags.length, errors, warnings, infos, passed: errors === 0 }
  }, [displayFlags])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setEdited(true)
  }, [])

  const validate = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setError(language === 'ar' ? 'حجم الملف يتجاوز 10 ميجابايت' : 'File exceeds 10 MB')
        return
      }
      setState('loading')
      setError('')
      setFileName(file.name)
      setFile(file)
      try {
        // Read the QR off the image before validating so the API can cross-check
        // the real payload against the printed values.
        const qrPayload = await scanQrFromFile(file).catch(() => null)
        const data = await validateInvoiceFile(file, language, qrPayload)
        setResult(data)
        setState('results')
        onValidationComplete?.(data)
        // Persist for signed-in users.
        if (isAuthenticated) {
          saveValidation(data, file.name, clientId, file).then((id) => {
            if (id) onSaved?.()
          })
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setState('idle')
      }
    },
    [language, isAuthenticated, clientId, onValidationComplete, onSaved]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) validate(file)
    },
    [validate]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validate(file)
      e.target.value = ''
    },
    [validate]
  )

  const reset = () => {
    setState('idle')
    setResult(null)
    setError('')
    setFile(null)
    setFileName(null)
    setDraft({})
    setEdited(false)
  }

  // ── Idle (drag-drop upload zone) ──────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`
            border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer
            ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted'}
          `}
          onClick={() => document.getElementById('zatca-file-input')?.click()}
        >
          <Upload size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground mb-1">
            {isRtl ? 'اسحب الفاتورة هنا أو انقر للاختيار' : 'Drop invoice here or click to choose'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isRtl ? 'PDF، صور، CSV — حتى 10 ميجابايت' : 'PDF, images, CSV — up to 10 MB'}
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <input
            id="zatca-file-input"
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col items-center gap-4 py-16 text-primary">
        <Loader2 size={36} className="animate-spin" />
        <p className="font-medium">
          {isRtl ? 'جارٍ تحليل الفاتورة والتحقق من الامتثال...' : 'Extracting invoice fields and checking compliance…'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isRtl ? 'قد يستغرق هذا حتى 30 ثانية' : 'This may take up to 30 seconds'}
        </p>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (!result || !editedExtracted) return null

  const extracted = editedExtracted
  const summary = liveSummary
  const orderedFlags = [
    ...displayFlags.filter((f) => f.severity === 'error'),
    ...displayFlags.filter((f) => f.severity === 'warning'),
    ...displayFlags.filter((f) => f.severity === 'info'),
  ]
  const hasQr = extracted.hasQrCode === true || !!extracted.qrCode?.trim()
  // A non-empty qrCode payload means we actually decoded the barcode (the model
  // can't), so we can say whether it cross-checked against the printed values.
  const qrScanned = !!extracted.qrCode?.trim()
  const qrMatched =
    qrScanned && !displayFlags.some((f) => f.code.startsWith('QR_') && f.code !== 'QR_PHASE2_DETECTED')
  // The result object reflecting any inline edits — used for PDF export.
  const liveResult: ValidationResult = {
    extracted,
    flags: displayFlags,
    summary,
    language: result.language,
  }
  // Prefer the freshly uploaded file; fall back to a stored file's signed URL.
  const previewUrl = fileUrl ?? initialFileUrl
  const isImg = file ? file.type.startsWith('image/') : kindFromName(fileName) === 'img'
  const isPdf = file ? file.type === 'application/pdf' : kindFromName(fileName) === 'pdf'

  const bannerTone = summary.passed
    ? 'pass'
    : summary.errors > 0
      ? 'fail'
      : 'warn'

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="grid grid-cols-1 lg:grid-cols-[5fr_6fr] gap-4 items-stretch"
    >
      {/* ── LEFT: invoice preview ── */}
      <div className="rounded-2xl border border-border overflow-hidden flex flex-col bg-card">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            {isRtl ? 'الفاتورة' : 'INVOICE'}
          </span>
          {fileName && (
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground min-w-0">
              <span className="w-6 h-7 rounded bg-muted border border-border flex items-center justify-center font-mono text-[8px] shrink-0">
                {isPdf ? 'PDF' : isImg ? 'IMG' : 'DOC'}
              </span>
              <span className="truncate">{fileName}</span>
            </span>
          )}
        </div>
        <div className="flex-1 min-h-[440px] max-h-[72vh] overflow-auto bg-muted p-4">
          {previewUrl && isImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={fileName ?? 'invoice'} className="max-w-full mx-auto rounded-lg shadow-sm" />
          ) : previewUrl && isPdf ? (
            <iframe src={previewUrl} title="invoice" className="w-full h-full min-h-[440px] rounded-lg bg-card" />
          ) : (
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-3">
                {isRtl ? 'معاينة المستند غير متاحة — عرض البيانات المستخرجة:' : 'Document preview unavailable — showing extracted data:'}
              </p>
              <ExtractedGrid data={extracted} language={language} />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: validation report ── */}
      <div className="rounded-2xl border border-border overflow-hidden flex flex-col bg-card">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
            {isRtl ? 'تقرير الفحص' : 'VALIDATION REPORT'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              summary.passed
                ? 'bg-accent text-accent-foreground'
                : 'bg-warning-soft text-warning-foreground'
            }`}
          >
            {summary.passed
              ? isRtl ? 'مطابق' : 'Passed'
              : isRtl
                ? `${summary.errors + summary.warnings} ملاحظة`
                : `${summary.errors + summary.warnings} issue${summary.errors + summary.warnings !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* summary banner */}
          <div
            className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 border ${
              bannerTone === 'pass'
                ? 'bg-accent border-primary/20'
                : bannerTone === 'fail'
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-warning-soft border-warning/40'
            }`}
          >
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${
                bannerTone === 'pass' ? 'bg-primary' : bannerTone === 'fail' ? 'bg-destructive' : 'bg-warning'
              }`}
            >
              {bannerTone === 'pass' ? <CheckCircle size={22} /> : bannerTone === 'fail' ? <XCircle size={22} /> : <AlertTriangle size={20} />}
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-foreground">
                {summary.passed
                  ? isRtl ? 'اجتازت الفاتورة جميع الفحوصات' : 'Passed all checks'
                  : isRtl ? 'توجد ملاحظات تتطلب المراجعة' : 'Issues requiring attention'}
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {isRtl
                  ? `${summary.errors} خطأ · ${summary.warnings} تحذير · ${summary.infos} معلومة`
                  : `${summary.errors} error${summary.errors !== 1 ? 's' : ''} · ${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''} · ${summary.infos} info`}
              </p>
            </div>
          </div>

          {/* issues */}
          {orderedFlags.length > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                  {isRtl ? `الملاحظات (${orderedFlags.length})` : `ISSUES (${orderedFlags.length})`}
                </span>
                {edited && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                    <RotateCcw size={11} />
                    {isRtl ? 'أُعيد الفحص بعد التعديل' : 'Re-checked after edits'}
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {orderedFlags.map((f, i) => (
                  <IssueCard key={i} flag={f} language={language} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-primary">{isRtl ? 'لا توجد مشكلات.' : 'No issues found.'}</p>
          )}

          {/* extracted data — editable */}
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Pencil size={11} />
              <span className="text-[11px]">
                {isRtl
                  ? 'صحّح أي حقل قرأه النظام خطأً — تتحدّث الفحوصات فورًا'
                  : 'Fix any misread field — checks update instantly'}
              </span>
            </div>
            <EditableGrid
              draft={draft}
              language={language}
              hasQr={hasQr}
              qrScanned={qrScanned}
              qrMatched={qrMatched}
              onChange={handleFieldChange}
            />
          </div>
        </div>

        {/* action bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <span className="text-[13px] text-muted-foreground hidden sm:block">
            {isRtl ? 'صدّر التقرير أو افحص فاتورة أخرى' : 'Export the report or check another invoice'}
          </span>
          <div className="flex gap-2 ms-auto">
            <button
              onClick={() => openReport(liveResult, fileName, language)}
              className="h-10 px-4 rounded-[10px] border border-border text-sm font-semibold flex items-center gap-1.5 hover:border-primary hover:text-primary transition-colors"
            >
              <Download size={14} />
              {isRtl ? 'تصدير PDF' : 'Export PDF'}
            </button>
            <button
              onClick={reset}
              className="h-10 px-4 rounded-[10px] bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:brightness-95 transition"
            >
              <RotateCcw size={14} />
              {isRtl ? 'فاتورة جديدة' : 'New invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
