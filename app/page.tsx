'use client'

import { useState, useEffect, useCallback } from 'react'
import { Language } from '@/types/chat'
import { Header } from '@/components/header/Header'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { HistorySidebar } from '@/components/sidebar/HistorySidebar'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [supabase] = useState(() => createClient())
  const [language, setLanguage] = useState<Language>('ar')
  const [user, setUser] = useState<User | null>(null)

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [newSeed, setNewSeed] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Reset to a fresh chat when auth state flips.
      setActiveConversationId(null)
      setNewSeed((s) => s + 1)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('sa-lang', next)
      return next
    })
  }

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null)
    setNewSeed((s) => s + 1)
    setHistoryOpen(false)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setHistoryOpen(false)
  }, [])

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id)
    setRefreshSignal((s) => s + 1)
  }, [])

  const handlePersisted = useCallback(() => setRefreshSignal((s) => s + 1), [])

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#F8F9FA]">
      <Header
        language={language}
        onToggleLanguage={toggleLanguage}
        onNewChat={handleNewChat}
        showHistoryToggle={!!user}
        onToggleHistory={() => setHistoryOpen((o) => !o)}
      />
      <div className="flex flex-1 min-h-0">
        {user && (
          <HistorySidebar
            language={language}
            activeId={activeConversationId}
            open={historyOpen}
            refreshSignal={refreshSignal}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onClose={() => setHistoryOpen(false)}
          />
        )}
        <ChatContainer
          key={activeConversationId ?? `new-${newSeed}`}
          language={language}
          isAuthenticated={!!user}
          conversationId={activeConversationId}
          onConversationCreated={handleConversationCreated}
          onPersisted={handlePersisted}
        />
      </div>
    </div>
  )
}
