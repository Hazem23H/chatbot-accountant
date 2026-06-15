'use client'

import { useState, useCallback, DragEvent } from 'react'
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

function FlagRow({ flag, language }: { flag: ValidationFlag; language: string }) {
  const isAr = language === 'ar'
  const msg = isAr ? flag.messageAr : flag.message

  if (flag.severity === 'error')
    return (
      <div className="flex items-start gap-2 text-red-700">
        <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
        <span className="text-sm">{msg}</span>
      </div>
    )
  if (flag.severity === 'warning')
    return (
      <div className="flex items-start gap-2 text-amber-700">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
        <span className="text-sm">{msg}</span>
      </div>
    )
  return (
    <div className="flex items-start gap-2 text-blue-700">
      <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
      <span className="text-sm">{msg}</span>
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
          <div key={labelEn} className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-400">{isAr ? labelAr : labelEn}</p>
            <p className="text-sm font-medium text-gray-800 break-all">{String(value)}</p>
          </div>
        ) : null
      )}
    </div>
  )
}

export function InvoiceValidator({
  language = 'ar',
  isAuthenticated = false,
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
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const isRtl = language === 'ar'

  const validate = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        setError(language === 'ar' ? 'حجم الملف يتجاوز 10 ميجابايت' : 'File exceeds 10 MB')
        return
      }
      setState('loading')
      setError('')
      setFileName(file.name)
      try {
        const data = await validateInvoiceFile(file, language)
        setResult(data)
        setState('results')
        onValidationComplete?.(data)
        // Persist for signed-in users.
        if (isAuthenticated) {
          saveValidation(data, file.name).then((id) => {
            if (id) onSaved?.()
          })
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setState('idle')
      }
    },
    [language, isAuthenticated, onValidationComplete, onSaved]
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
              ? 'border-[#0D4F8C] bg-[#0D4F8C]/5'
              : 'border-gray-200 hover:border-[#0D4F8C]/50 hover:bg-gray-50'}
          `}
          onClick={() => document.getElementById('zatca-file-input')?.click()}
        >
          <Upload size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700 mb-1">
            {isRtl ? 'اسحب الفاتورة هنا أو انقر للاختيار' : 'Drop invoice here or click to choose'}
          </p>
          <p className="text-sm text-gray-400">
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
      <div dir={isRtl ? 'rtl' : 'ltr'} className="flex flex-col items-center gap-4 py-16 text-[#0D4F8C]">
        <Loader2 size={36} className="animate-spin" />
        <p className="font-medium">
          {isRtl ? 'جارٍ تحليل الفاتورة والتحقق من الامتثال...' : 'Extracting invoice fields and checking compliance…'}
        </p>
        <p className="text-sm text-gray-400">
          {isRtl ? 'قد يستغرق هذا حتى 30 ثانية' : 'This may take up to 30 seconds'}
        </p>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (!result) return null

  const { extracted, flags, summary } = result
  const errors = flags.filter((f) => f.severity === 'error')
  const warnings = flags.filter((f) => f.severity === 'warning')
  const infos = flags.filter((f) => f.severity === 'info')

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Pass / Fail badge */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl ${summary.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {summary.passed
          ? <CheckCircle size={28} className="text-green-500 shrink-0" />
          : <XCircle size={28} className="text-red-500 shrink-0" />}
        <div className="flex-1">
          <p className={`font-bold text-lg ${summary.passed ? 'text-green-700' : 'text-red-700'}`}>
            {summary.passed
              ? (isRtl ? 'اجتازت الفاتورة جميع الفحوصات' : 'Invoice Passed All Checks')
              : (isRtl ? 'تحتوي الفاتورة على مشكلات تتطلب المراجعة' : 'Invoice Has Issues Requiring Attention')}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {isRtl
              ? `${summary.errors} خطأ · ${summary.warnings} تحذير · ${summary.infos} معلومة`
              : `${summary.errors} error${summary.errors !== 1 ? 's' : ''} · ${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''} · ${summary.infos} info`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openReport(result, fileName, language)}
            className="flex items-center gap-1.5 text-sm text-[#0D4F8C] hover:text-[#0a3f73] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60"
          >
            <Download size={14} />
            {isRtl ? 'تصدير PDF' : 'Export PDF'}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60"
          >
            <RotateCcw size={14} />
            {isRtl ? 'فاتورة جديدة' : 'New invoice'}
          </button>
        </div>
      </div>

      {/* Extracted data grid */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <FileText size={15} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">
            {isRtl ? 'البيانات المستخرجة' : 'Extracted Data'}
          </span>
        </div>
        <div className="p-4">
          <ExtractedGrid data={extracted} language={language} />
        </div>
      </div>

      {/* Flags by severity */}
      {flags.length > 0 && (
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700">
              {isRtl ? 'نتائج الفحص' : 'Validation Results'}
            </span>
          </div>
          <div className="p-4 space-y-4">
            {errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  {isRtl ? `أخطاء (${errors.length})` : `Errors (${errors.length})`}
                </p>
                <div className="space-y-2 pl-1">
                  {errors.map((f, i) => <FlagRow key={i} flag={f} language={language} />)}
                </div>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  {isRtl ? `تحذيرات (${warnings.length})` : `Warnings (${warnings.length})`}
                </p>
                <div className="space-y-2 pl-1">
                  {warnings.map((f, i) => <FlagRow key={i} flag={f} language={language} />)}
                </div>
              </div>
            )}
            {infos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  {isRtl ? `معلومات (${infos.length})` : `Info (${infos.length})`}
                </p>
                <div className="space-y-2 pl-1">
                  {infos.map((f, i) => <FlagRow key={i} flag={f} language={language} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
