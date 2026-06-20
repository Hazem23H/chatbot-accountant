'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpen, ExternalLink, MessageSquare, Trash2, Plus } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { createClient } from '@/lib/supabase/client'
import { listConversations, deleteConversation, type ConversationSummary } from '@/lib/chat-history'
import { getCitations } from '@/lib/citations'
import type { Language } from '@/types/chat'

function ChatInner() {
  const searchParams = useSearchParams()
  const initialC = searchParams.get('c')
  const initialQ = searchParams.get('q') ?? undefined

  const [supabase] = useState(() => createClient())
  const [language, setLanguage] = useState<Language>('ar')
  const [isAuthed, setIsAuthed] = useState(false)

  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialC)
  const [sessionKey, setSessionKey] = useState(initialC ?? 'new-0')
  const [recent, setRecent] = useState<ConversationSummary[]>([])
  const [citations, setCitations] = useState<string[]>([])

  const isRtl = language === 'ar'

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
    document.documentElement.dir = (saved ?? 'ar') === 'ar' ? 'rtl' : 'ltr'
  }, [])

  const refreshRecent = useCallback(async () => {
    setRecent(await listConversations())
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user)
      if (data.user) refreshRecent()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const authed = !!session?.user
      setIsAuthed(authed)
      if (authed) refreshRecent()
      else setRecent([])
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, refreshRecent])

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('sa-lang', next)
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
      return next
    })
  }, [])

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null)
    setSessionKey(`new-${Date.now()}`)
    setCitations([])
  }, [])

  const handleSelect = useCallback((id: string) => {
    setActiveConversationId(id)
    setSessionKey(id)
    setCitations([])
  }, [])

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id)
    refreshRecent()
  }, [refreshRecent])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setRecent((prev) => prev.filter((c) => c.id !== id))
    await deleteConversation(id)
    if (id === activeConversationId) handleNewChat()
  }

  const sources = getCitations(citations)

  const sidebarExtra = isAuthed ? (
    <div>
      <div className="flex items-center justify-between px-2 pb-2.5">
        <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
          {isRtl ? 'المحادثات' : 'RECENT CHATS'}
        </span>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1 text-[13px] text-primary font-semibold"
        >
          <Plus size={13} /> {isRtl ? 'جديد' : 'New'}
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-3">
            {isRtl ? 'لا توجد محادثات بعد' : 'No conversations yet'}
          </p>
        ) : (
          recent.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-start text-[13px] transition-colors ${
                c.id === activeConversationId
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <MessageSquare size={14} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate">{c.title}</span>
              <span
                onClick={(e) => handleDelete(e, c.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <Trash2 size={13} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  ) : undefined

  return (
    <AppShell
      active="chat"
      language={language}
      onToggleLanguage={toggleLanguage}
      sidebarExtra={sidebarExtra}
    >
      {/* conversation */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ChatContainer
          key={sessionKey}
          language={language}
          isAuthenticated={isAuthed}
          initialConversationId={activeConversationId}
          initialQuery={activeConversationId ? undefined : initialQ}
          onConversationCreated={handleConversationCreated}
          onPersisted={refreshRecent}
          onLatestCitations={setCitations}
        />
      </div>

      {/* sources panel */}
      <aside className="hidden lg:flex flex-[0_0_300px] flex-col bg-card border-s border-border p-[18px] overflow-y-auto">
        <div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground mb-3.5">
          {(isRtl ? 'المصادر' : 'SOURCES')} {sources.length > 0 ? `(${sources.length})` : ''}
        </div>
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center flex-1 text-muted-foreground gap-2 px-4">
            <BookOpen size={22} className="opacity-40" />
            <p className="text-xs leading-relaxed">
              {isRtl
                ? 'تظهر هنا المصادر الرسمية التي تستند إليها الإجابات.'
                : 'Official sources backing each answer appear here.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sources.map((c, i) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border rounded-xl p-3.5 hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
                    ZATCA
                  </span>
                </div>
                <div className="text-[14px] font-semibold leading-snug flex items-start gap-1">
                  <span className="flex-1">{isRtl ? c.titleAr : c.titleEn}</span>
                  <ExternalLink size={12} className="opacity-50 mt-1 shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}
      </aside>
    </AppShell>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <ChatInner />
    </Suspense>
  )
}
