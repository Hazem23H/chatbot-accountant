'use client'

import { useEffect, useRef } from 'react'
import { Message, Language } from '@/types/chat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  language: Language
}

export function MessageList({ messages, isLoading, language }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} language={language} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
