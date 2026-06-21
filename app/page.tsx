'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Percent, Calculator, FileCheck2, ArrowUpRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { createClient } from '@/lib/supabase/client'
import { listConversations, type ConversationSummary } from '@/lib/chat-history'
import { useWorkspace } from '@/lib/use-workspace'
import type { Language } from '@/types/chat'

const t = {
  ar: {
    greeting: 'مرحبًا 👋',
    greetingSub: 'بماذا يمكنني مساعدتك اليوم؟',
    askPh: 'اسأل عن الزكاة، ضريبة القيمة المضافة، IFRS، الفوترة الإلكترونية…',
    askBtn: 'اسأل',
    sug1: 'نسبة ضريبة القيمة المضافة والتسجيل',
    sug2: 'حساب وعاء الزكاة',
    sug3: 'مراحل الفوترة الإلكترونية',
    toolsTitle: 'الأدوات',
    tool1: 'مدقّق الفواتير',
    tool1d: 'تحقّق من حقول الفاتورة الإلكترونية وفق هيئة الزكاة والضريبة',
    tool2: 'حاسبة الزكاة',
    tool2d: 'قدّر وعاء الزكاة المستحق على المنشأة',
    tool3: 'حاسبة ضريبة القيمة المضافة',
    tool3d: 'احسب مبالغ الضريبة وأعدّ الإقرارات',
    tool4: 'فحص الفوترة الإلكترونية',
    tool4d: 'تحقّق من الجاهزية للمرحلتين الأولى والثانية',
    soon: 'قريبًا',
    recentTitle: 'الأخيرة',
    disclaimer: 'للتوجيه العام فقط. تحقق دائمًا من المصادر الرسمية للقرارات الحرجة.',
  },
  en: {
    greeting: 'Welcome 👋',
    greetingSub: 'What can I help you with today?',
    askPh: 'Ask about Zakat, VAT, IFRS, e-invoicing…',
    askBtn: 'Ask',
    sug1: 'VAT rate & registration',
    sug2: 'Calculate Zakat base',
    sug3: 'E-invoicing phases',
    toolsTitle: 'Tools',
    tool1: 'Invoice validator',
    tool1d: 'Check ZATCA e-invoice fields and flag issues',
    tool2: 'Zakat calculator',
    tool2d: "Estimate your company's Zakat base",
    tool3: 'VAT calculator',
    tool3d: 'Compute VAT amounts and prepare returns',
    tool4: 'E-invoicing check',
    tool4d: 'Assess Phase 1 & Phase 2 readiness',
    soon: 'Soon',
    recentTitle: 'Recent',
    disclaimer: 'General guidance only. Always verify official sources for critical decisions.',
  },
}

export default function DashboardPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [language, setLanguage] = useState<Language>('ar')
  const [ask, setAsk] = useState('')
  const [recent, setRecent] = useState<ConversationSummary[]>([])
  const [isAuthed, setIsAuthed] = useState(false)
  const { clientId, clients, selectWorkspace, refreshClients } = useWorkspace()

  const isRtl = language === 'ar'
  const tr = t[language]

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
    document.documentElement.lang = saved ?? 'ar'
    document.documentElement.dir = (saved ?? 'ar') === 'ar' ? 'rtl' : 'ltr'
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user)
      if (data.user) listConversations(clientId).then((c) => setRecent(c.slice(0, 4)))
      else setRecent([])
    })
  }, [supabase, clientId])

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('sa-lang', next)
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = next
      return next
    })
  }, [])

  const goAsk = (q: string) => {
    const query = q.trim()
    router.push(query ? `/chat?q=${encodeURIComponent(query)}` : '/chat')
  }

  const tools = [
    { icon: ShieldCheck, title: tr.tool1, desc: tr.tool1d, href: '/validator' as const, soon: false },
    { icon: Percent, title: tr.tool2, desc: tr.tool2d, href: null, soon: true },
    { icon: Calculator, title: tr.tool3, desc: tr.tool3d, href: null, soon: true },
    { icon: FileCheck2, title: tr.tool4, desc: tr.tool4d, href: '/validator' as const, soon: false },
  ]

  return (
    <AppShell active="home" language={language} onToggleLanguage={toggleLanguage}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* top bar */}
        <div className="border-b border-border">
          <div className="max-w-[960px] mx-auto px-6 md:px-9 py-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[22px] font-semibold leading-tight">{tr.greeting}</div>
              <div className="text-[13px] text-muted-foreground mt-1">{tr.greetingSub}</div>
            </div>
            {isAuthed && (
              <WorkspaceSwitcher
                language={language}
                clientId={clientId}
                clients={clients}
                onSelect={selectWorkspace}
                onCreated={refreshClients}
              />
            )}
          </div>
        </div>

        <div className="px-6 md:px-9 py-8 pb-12">
          <div className="max-w-[960px] mx-auto">
            {/* ASK */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  goAsk(ask)
                }}
                className="flex items-center gap-3"
              >
                <input
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  placeholder={tr.askPh}
                  className="flex-1 h-[50px] rounded-[11px] border border-border bg-card px-4 text-[15px] focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/40"
                />
                <button
                  type="submit"
                  className="h-[50px] px-6 rounded-[11px] bg-primary text-primary-foreground font-semibold hover:brightness-95 transition"
                >
                  {tr.askBtn}
                </button>
              </form>
              <div className="flex flex-wrap gap-2 mt-4">
                {[tr.sug1, tr.sug2, tr.sug3].map((s) => (
                  <button
                    key={s}
                    onClick={() => goAsk(s)}
                    className="text-[13px] border border-border rounded-full px-3.5 py-1.5 hover:border-primary hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* TOOLS */}
            <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted-foreground mt-9 mb-3.5">
              {tr.toolsTitle}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {tools.map(({ icon: Icon, title, desc, href, soon }) => {
                const inner = (
                  <>
                    <div className="shrink-0 w-10 h-10 rounded-[10px] bg-accent text-accent-foreground flex items-center justify-center">
                      <Icon size={19} />
                    </div>
                    <div>
                      <div className="text-[16px] font-semibold flex items-center gap-2">
                        {title}
                        {soon && (
                          <span className="text-[10px] font-medium text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
                            {tr.soon}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{desc}</div>
                    </div>
                  </>
                )
                const cls =
                  'bg-card border border-border rounded-2xl p-[18px] flex gap-3.5 items-start transition-colors hover:border-primary hover:shadow-sm'
                return href ? (
                  <Link key={title} href={href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div key={title} className={cls + ' opacity-80 cursor-default'}>
                    {inner}
                  </div>
                )
              })}
            </div>

            {/* RECENT */}
            {recent.length > 0 && (
              <>
                <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted-foreground mt-9 mb-3.5">
                  {tr.recentTitle}
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {recent.map((c) => (
                    <Link
                      key={c.id}
                      href={`/chat?c=${c.id}`}
                      className="flex items-center justify-between px-[18px] py-[15px] hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-[7px] h-[7px] rounded-full bg-primary shrink-0" />
                        <span className="text-sm truncate">{c.title}</span>
                      </div>
                      <ArrowUpRight size={15} className="text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="text-[11px] text-muted-foreground mt-6 leading-relaxed">{tr.disclaimer}</div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
