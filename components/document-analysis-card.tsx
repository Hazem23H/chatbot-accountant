'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FileSearch,
} from 'lucide-react'

interface KeyFigure {
  label: string
  value: string
}

interface Flag {
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface AnalysisResult {
  documentType: string
  summary: string
  keyFigures: KeyFigure[]
  flags: Flag[]
  recommendations: string[]
  language: string
  // Present only when the API returns an error payload instead of a result
  error?: string
}

interface DocumentAnalysisCardProps {
  file: File
  language?: 'ar' | 'en'
  onAnalysisComplete?: (result: AnalysisResult) => void
}

function FlagIcon({ severity }: { severity: Flag['severity'] }) {
  if (severity === 'error')
    return <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
  if (severity === 'warning')
    return <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
  return <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
}

function flagTextColor(severity: Flag['severity']) {
  if (severity === 'error') return 'text-red-700'
  if (severity === 'warning') return 'text-amber-700'
  return 'text-blue-700'
}

export function DocumentAnalysisCard({
  file,
  language = 'ar',
  onAnalysisComplete,
}: DocumentAnalysisCardProps) {
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const isRtl = language === 'ar'

  useEffect(() => {
    setState('loading')
    setResult(null)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', language)

    fetch('/api/analyze', { method: 'POST', body: formData })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: AnalysisResult = await res.json()
        if (data.error) throw new Error(String(data.error))
        setResult(data)
        setState('done')
        onAnalysisComplete?.(data)
      })
      .catch((err: Error) => {
        setErrorMsg(err.message)
        setState('error')
      })
  }, [file]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'loading') {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3 animate-pulse">
        <FileSearch size={16} className="text-primary shrink-0" />
        <span className="text-sm text-primary">
          {language === 'ar' ? 'جارٍ تحليل الوثيقة...' : 'Analyzing document...'}
        </span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
        <AlertCircle size={14} className="text-red-500 shrink-0" />
        <span className="text-sm text-red-700">
          {language === 'ar'
            ? 'تعذّر تحليل الوثيقة'
            : `Analysis failed: ${errorMsg}`}
        </span>
      </div>
    )
  }

  if (!result) return null

  const hasIssues = result.flags.some(
    (f) => f.severity === 'error' || f.severity === 'warning'
  )

  return (
    <div
      className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden text-sm"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary/6 border-b border-primary/10">
        <div className="flex items-center gap-2 min-w-0">
          <FileSearch size={15} className="text-primary shrink-0" />
          <span className="font-semibold text-primary truncate max-w-[160px]">
            {file.name}
          </span>
          <span className="text-primary/60 text-xs shrink-0">
            — {result.documentType}
          </span>
        </div>
        {hasIssues ? (
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
        ) : (
          <CheckCircle size={15} className="text-green-500 shrink-0" />
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Summary */}
        <p className="text-muted-foreground leading-relaxed">{result.summary}</p>

        {/* Key Figures */}
        {result.keyFigures.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {result.keyFigures.map((kf, i) => (
              <div key={i} className="bg-muted rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{kf.label}</p>
                <p className="font-semibold text-foreground">{kf.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Flags */}
        {result.flags.length > 0 && (
          <div className="space-y-1.5">
            {result.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2">
                <FlagIcon severity={flag.severity} />
                <span className={flagTextColor(flag.severity)}>{flag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {language === 'ar' ? 'التوصيات' : 'Recommendations'}
            </p>
            <ol className="space-y-1 list-decimal list-inside">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="text-foreground">
                  {rec}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
