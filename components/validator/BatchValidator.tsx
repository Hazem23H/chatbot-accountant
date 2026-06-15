'use client'

import { useState, useCallback, DragEvent } from 'react'
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
  Download,
  RotateCcw,
} from 'lucide-react'
import { validateInvoiceFile, ACCEPTED_TYPES, MAX_BYTES } from '@/lib/validate-client'
import { saveValidation, type ValidationResult } from '@/lib/validation-history'
import { openReport } from '@/lib/validation-report'

type ItemStatus = 'pending' | 'running' | 'done' | 'error'

interface BatchItem {
  id: string
  file: File
  name: string
  status: ItemStatus
  result?: ValidationResult
  error?: string
}

interface BatchValidatorProps {
  language: 'ar' | 'en'
  isAuthenticated: boolean
  onSaved?: () => void
}

export function BatchValidator({ language, isAuthenticated, onSaved }: BatchValidatorProps) {
  const isRtl = language === 'ar'
  const [items, setItems] = useState<BatchItem[]>([])
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const update = (id: string, patch: Partial<BatchItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const runBatch = useCallback(
    async (files: File[]) => {
      const valid = files.filter((f) => f.size <= MAX_BYTES)
      if (valid.length === 0) return

      const newItems: BatchItem[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        status: 'pending',
      }))
      setItems(newItems)
      setRunning(true)

      // Sequential — keeps within API/Gemini limits and gives clear progress.
      for (const item of newItems) {
        update(item.id, { status: 'running' })
        try {
          const result = await validateInvoiceFile(item.file, language)
          update(item.id, { status: 'done', result })
          if (isAuthenticated) {
            saveValidation(result, item.name).then((id) => {
              if (id) onSaved?.()
            })
          }
        } catch (err) {
          update(item.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Error',
          })
        }
      }
      setRunning(false)
    },
    [language, isAuthenticated, onSaved]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      runBatch(Array.from(e.dataTransfer.files))
    },
    [runBatch]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) runBatch(Array.from(e.target.files))
      e.target.value = ''
    },
    [runBatch]
  )

  const reset = () => {
    setItems([])
    setRunning(false)
  }

  // ── Drop zone ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('zatca-batch-input')?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-[#0D4F8C] bg-[#0D4F8C]/5'
              : 'border-gray-200 hover:border-[#0D4F8C]/50 hover:bg-gray-50'
          }`}
        >
          <Upload size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700 mb-1">
            {isRtl ? 'اسحب عدة فواتير هنا أو انقر للاختيار' : 'Drop multiple invoices or click to choose'}
          </p>
          <p className="text-sm text-gray-400">
            {isRtl ? 'PDF، صور، CSV — حتى 10 ميجابايت لكل ملف' : 'PDF, images, CSV — up to 10 MB each'}
          </p>
          <input
            id="zatca-batch-input"
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handleInput}
          />
        </div>
      </div>
    )
  }

  // ── Summary + table ───────────────────────────────────────────────────────
  const done = items.filter((i) => i.status === 'done')
  const passed = done.filter((i) => i.result?.summary.passed).length
  const failed = done.filter((i) => i.result && !i.result.summary.passed).length
  const errored = items.filter((i) => i.status === 'error').length
  const completed = done.length + errored

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200">
        {running ? (
          <Loader2 size={24} className="text-[#0D4F8C] animate-spin shrink-0" />
        ) : (
          <CheckCircle size={24} className="text-[#0D4F8C] shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-bold text-gray-800">
            {running
              ? isRtl
                ? `جارٍ المعالجة… ${completed}/${items.length}`
                : `Processing… ${completed}/${items.length}`
              : isRtl
                ? 'اكتمل الفحص'
                : 'Batch complete'}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {isRtl
              ? `${passed} ناجحة · ${failed} بها مشكلات${errored ? ` · ${errored} فشل` : ''}`
              : `${passed} passed · ${failed} with issues${errored ? ` · ${errored} failed` : ''}`}
          </p>
        </div>
        {!running && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/60"
          >
            <RotateCcw size={14} />
            {isRtl ? 'دفعة جديدة' : 'New batch'}
          </button>
        )}
      </div>

      {/* Rows */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-4 py-3">
            <StatusIcon status={it.status} passed={it.result?.summary.passed} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{it.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {it.status === 'done' && it.result
                  ? isRtl
                    ? `${it.result.summary.errors} خطأ · ${it.result.summary.warnings} تحذير`
                    : `${it.result.summary.errors} err · ${it.result.summary.warnings} warn`
                  : it.status === 'error'
                    ? it.error
                    : it.status === 'running'
                      ? isRtl
                        ? 'جارٍ الفحص…'
                        : 'Validating…'
                      : isRtl
                        ? 'في الانتظار'
                        : 'Pending'}
              </p>
            </div>
            {it.status === 'done' && it.result && (
              <button
                onClick={() => openReport(it.result!, it.name, language)}
                className="flex items-center gap-1.5 text-xs text-[#0D4F8C] hover:text-[#0a3f73] px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
              >
                <Download size={13} />
                PDF
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status, passed }: { status: ItemStatus; passed?: boolean }) {
  if (status === 'running') return <Loader2 size={18} className="text-[#0D4F8C] animate-spin shrink-0" />
  if (status === 'pending') return <Clock size={18} className="text-gray-300 shrink-0" />
  if (status === 'error') return <AlertCircle size={18} className="text-gray-400 shrink-0" />
  return passed ? (
    <CheckCircle size={18} className="text-green-500 shrink-0" />
  ) : (
    <XCircle size={18} className="text-red-500 shrink-0" />
  )
}
