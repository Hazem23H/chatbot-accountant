'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ValidatorWorkspace } from '@/components/validator/ValidatorWorkspace'
import type { Language } from '@/types/chat'

export default function ValidatorPage() {
  const [language, setLanguage] = useState<Language>('ar')
  const isRtl = language === 'ar'

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
    document.documentElement.dir = (saved ?? 'ar') === 'ar' ? 'rtl' : 'ltr'
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('sa-lang', next)
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
      return next
    })
  }, [])

  return (
    <AppShell active="tools" language={language} onToggleLanguage={toggleLanguage}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* top bar */}
        <div className="px-6 md:px-9 py-5 border-b border-border">
          <div className="text-[19px] font-semibold leading-tight">
            {isRtl ? 'مدقّق الفواتير' : 'Invoice validator'}
          </div>
          <div className="text-[13px] text-muted-foreground mt-0.5">
            {isRtl
              ? 'فحص حقول الفاتورة الإلكترونية وفق هيئة الزكاة والضريبة'
              : 'Check ZATCA e-invoice fields and flag issues'}
          </div>
        </div>

        <div className="px-6 md:px-9 py-7 pb-12">
          <div className="max-w-[760px] mx-auto space-y-6">
            <ValidatorWorkspace language={language} />

            <div className="flex items-start gap-2 bg-warning-soft border border-warning/40 rounded-xl px-4 py-3 text-sm text-warning-foreground">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-warning" />
              <p>
                {isRtl
                  ? 'هذه الأداة للإرشاد العام فقط ولا تُغني عن مراجعة مستشار ضريبي معتمد. تحقق دائمًا من المتطلبات الحالية على zatca.gov.sa.'
                  : 'This tool provides general guidance only and does not substitute for a licensed tax advisor. Always verify current requirements at zatca.gov.sa.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
