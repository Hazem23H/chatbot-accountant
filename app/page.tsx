'use client'

import { useState, useEffect, useCallback } from 'react'
import { Language } from '@/types/chat'
import { Header } from '@/components/header/Header'
import { ChatContainer } from '@/components/chat/ChatContainer'

export default function Home() {
  const [language, setLanguage] = useState<Language>('ar')
  const [chatKey, setChatKey] = useState(0)

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
  }, [])

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('sa-lang', next)
      return next
    })
  }

  const handleNewChat = useCallback(() => setChatKey((k) => k + 1), [])

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#F8F9FA]">
      <Header
        language={language}
        onToggleLanguage={toggleLanguage}
        onNewChat={handleNewChat}
      />
      <ChatContainer
        key={chatKey}
        language={language}
      />
    </div>
  )
}
