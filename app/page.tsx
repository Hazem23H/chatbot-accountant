'use client'

import { useState, useEffect, useCallback } from 'react'
import { Language, TopicId } from '@/types/chat'
import { Header } from '@/components/header/Header'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { MobileTopicBar } from '@/components/sidebar/MobileTopicBar'
import { ChatContainer } from '@/components/chat/ChatContainer'

export default function Home() {
  const [language, setLanguage] = useState<Language>('ar')
  const [activeTopic, setActiveTopic] = useState<TopicId | null>(null)
  const [chatKey, setChatKey] = useState(0)

  // Sync HTML dir/lang attributes with language state
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  // Restore language preference from localStorage
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

  const handleNewChat = useCallback(() => {
    setActiveTopic(null)
    setChatKey((k) => k + 1)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8F9FA]">
      <Header
        language={language}
        onToggleLanguage={toggleLanguage}
        onNewChat={handleNewChat}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          language={language}
          activeTopic={activeTopic}
          onTopicSelect={setActiveTopic}
        />

        <main className="flex flex-col flex-1 min-w-0 min-h-0">
          <MobileTopicBar
            language={language}
            activeTopic={activeTopic}
            onTopicSelect={setActiveTopic}
          />
          <ChatContainer
            key={chatKey}
            language={language}
            activeTopic={activeTopic}
            onTopicSelect={setActiveTopic}
          />
        </main>
      </div>
    </div>
  )
}
