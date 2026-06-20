'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Trash2, FileText, LogIn, File, Files } from 'lucide-react'
import { InvoiceValidator } from '@/components/invoice-validator'
import { BatchValidator } from '@/components/validator/BatchValidator'
import { createClient } from '@/lib/supabase/client'
import {
  listValidations,
  deleteValidation,
  type SavedValidation,
  type ValidationResult,
} from '@/lib/validation-history'
import type { Language } from '@/types/chat'

export function ValidatorWorkspace({ language }: { language: Language }) {
  const [supabase] = useState(() => createClient())
  const [isAuthed, setIsAuthed] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)

  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [saved, setSaved] = useState<SavedValidation[]>([])
  const [viewing, setViewing] = useState<ValidationResult | null>(null)
  const [viewingFileName, setViewingFileName] = useState<string | null>(null)
  const [validatorKey, setValidatorKey] = useState(0)

  const isRtl = language === 'ar'

  const refresh = useCallback(async () => {
    setSaved(await listValidations())
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user)
      setAuthResolved(true)
      if (data.user) refresh()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const authed = !!session?.user
      setIsAuthed(authed)
      if (authed) refresh()
      else setSaved([])
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, refresh])

  const openSaved = (v: SavedValidation) => {
    setViewing({
      extracted: v.extracted,
      flags: v.flags,
      summary: v.summary,
      language: v.language,
    })
    setViewingFileName(v.fileName)
    setValidatorKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSaved((prev) => prev.filter((v) => v.id !== id))
    await deleteValidation(id)
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-6">
      {/* Single / Batch toggle */}
      <div dir={isRtl ? 'rtl' : 'ltr'} className="grid grid-cols-2 gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => setMode('single')}
          className={`flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-md transition-colors ${
            mode === 'single' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <File size={15} />
          {isRtl ? 'فاتورة واحدة' : 'Single'}
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-md transition-colors ${
            mode === 'batch' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Files size={15} />
          {isRtl ? 'دفعة' : 'Batch'}
        </button>
      </div>

      {mode === 'single' ? (
        <InvoiceValidator
          key={validatorKey}
          language={language}
          isAuthenticated={isAuthed}
          initialResult={viewing}
          initialFileName={viewingFileName}
          onSaved={refresh}
        />
      ) : (
        <BatchValidator language={language} isAuthenticated={isAuthed} onSaved={refresh} />
      )}

      {/* Saved validations (signed-in) or sign-in nudge (anonymous) */}
      {authResolved && !isAuthed && (
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/5 hover:bg-primary/10 border border-primary/15 rounded-xl py-3 transition-colors"
        >
          <LogIn size={15} />
          {isRtl ? 'سجّل الدخول لحفظ نتائج الفحص' : 'Sign in to save your validation results'}
        </Link>
      )}

      {isAuthed && saved.length > 0 && (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-muted border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              {isRtl ? 'الفواتير المحفوظة' : 'Saved validations'}
            </span>
          </div>
          <div className="divide-y divide-border">
            {saved.map((v) => (
              <button
                key={v.id}
                onClick={() => openSaved(v)}
                className="group w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-muted transition-colors"
              >
                {v.summary.passed ? (
                  <CheckCircle size={18} className="text-green-500 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                    <FileText size={13} className="text-muted-foreground shrink-0" />
                    {v.fileName || (isRtl ? 'فاتورة' : 'Invoice')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDate(v.createdAt)}
                    {' · '}
                    {isRtl
                      ? `${v.summary.errors} خطأ · ${v.summary.warnings} تحذير`
                      : `${v.summary.errors} err · ${v.summary.warnings} warn`}
                  </p>
                </div>
                <span
                  onClick={(e) => handleDelete(e, v.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity p-1"
                  aria-label="delete"
                >
                  <Trash2 size={15} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
