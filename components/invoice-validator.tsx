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
} from 'lucide-react'
import type { ExtractedInvoice, ValidationFlag } from '@/lib/zatca-rules'
import { saveValidation, type ValidationResult } from '@/lib/validation-history'
import { openReport } from '@/lib/validation-report'
import { validateInvoiceFile, ACCEPTED_TYPES, MAX_BYTES } from '@/lib/validate-client'

interface InvoiceValidatorProps {
  language?: 'ar' | 'en'
  isAuthenticated?: boolean
  clientId?: string | null
  initialResult?: ValidationResult | null
  initialFileName?: string | null
  onValidationComplete?: (result: ValidationResult) => void
  onSaved?: () => void
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function IssueCard({ flag, language }: { flag: ValidationFlag; language: string }) {
  const isAr = language === 'ar'
  const msg = isAr ? flag.messageAr : flag.message

  const tone =
    flag.severity === 'error'
      ? { border: 'border-s-destructive', icon: <AlertCircle size={15} className="text-destructive" /> }
      : flag.severity === 'warning'
        ? { border: 'border-s-warning', icon: <AlertTriangle size={15} className="text-warning" /> }
        : { border: 'border-s-primary', icon: <Info size={15} className="text-primary" /> }

  return (
    <div className={`border border-border border-s-[3px] ${tone.border} rounded-xl px-3.5 py-3 flex items-start gap-2.5`}>
      <span className="shrink-0 mt-0.5">{tone.icon}</span>
      <span className="text-sm leading-relaxed text-foreground">{msg}</span>
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
    ['الوعاء الضريبي', 'Subtotal (excl. VAT)', data.subtotal !== undefined ? `SAR ${data.subtotal.toFixed(2)}` : undefined],
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

export function InvoiceValidator({
  language = 'ar',
  isAuthenticated = false,
  clientId = null,
  initialResult = null,
  initialFileName = null,
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

  const isRtl = language === 'ar'

  // Object URL for the invoice preview pane; revoked when the file changes.
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

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
        const data = await validateInvoiceFile(file, language)
        setResult(data)
        setState('results')
        onValidationComplete?.(data)
        // Persist for signed-in users.
        if (isAuthenticated) {
          saveValidation(data, file.name, clientId).then((id) => {
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
  if (!result) return null

  const { extracted, flags, summary } = result
  const orderedFlags = [
    ...flags.filter((f) => f.severity === 'error'),
    ...flags.filter((f) => f.severity === 'warning'),
    ...flags.filter((f) => f.severity === 'info'),
  ]
  const isImg = file?.type.startsWith('image/') ?? false
  const isPdf = file?.type === 'application/pdf'

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
          {fileUrl && isImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={fileName ?? 'invoice'} className="max-w-full mx-auto rounded-lg shadow-sm" />
          ) : fileUrl && isPdf ? (
            <iframe src={fileUrl} title="invoice" className="w-full h-full min-h-[440px] rounded-lg bg-card" />
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
              <div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground mb-3">
                {isRtl ? `الملاحظات (${orderedFlags.length})` : `ISSUES (${orderedFlags.length})`}
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

          {/* extracted data */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground mb-3">
              {isRtl ? 'البيانات المستخرجة' : 'EXTRACTED DATA'}
            </div>
            <ExtractedGrid data={extracted} language={language} />
          </div>
        </div>

        {/* action bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
          <span className="text-[13px] text-muted-foreground hidden sm:block">
            {isRtl ? 'صدّر التقرير أو افحص فاتورة أخرى' : 'Export the report or check another invoice'}
          </span>
          <div className="flex gap-2 ms-auto">
            <button
              onClick={() => openReport(result, fileName, language)}
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
