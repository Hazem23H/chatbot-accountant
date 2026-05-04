'use client'

import { useState, useCallback } from 'react'
import { Message, Attachment, Language, TopicId } from '@/types/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { WelcomeScreen } from './WelcomeScreen'
import { QuickPrompts } from '@/components/sidebar/QuickPrompts'

interface ChatContainerProps {
  language: Language
  activeTopic: TopicId | null
  onTopicSelect: (topicId: TopicId) => void
}

export function ChatContainer({ language, activeTopic, onTopicSelect }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (content: string) => {
      const hasContent = content.trim().length > 0
      const hasAttachment = attachment !== null
      if ((!hasContent && !hasAttachment) || isLoading) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
        attachment: attachment ?? undefined,
      }

      const assistantMessageId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setInputValue('')
      setAttachment(null)
      setIsLoading(true)

      try {
        // Build API history including attachment data for each message
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
          attachment: m.attachment,
        }))

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            language,
            topicId: activeTopic,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error('Failed to get response')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const snapshot = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: snapshot, isStreaming: true } : m
            )
          )
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: accumulated, isStreaming: false } : m
          )
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    language === 'ar'
                      ? 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.'
                      : 'Sorry, an error occurred. Please try again.',
                  isStreaming: false,
                }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, language, activeTopic, attachment, isLoading]
  )

  const handleTopicClick = (topicId: string) => {
    onTopicSelect(topicId as TopicId)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#F8F9FA]">
      {messages.length === 0 ? (
        <WelcomeScreen language={language} onTopicClick={handleTopicClick} />
      ) : (
        <MessageList messages={messages} isLoading={isLoading} />
      )}

      <QuickPrompts
        language={language}
        activeTopic={activeTopic}
        onPromptClick={(text) => setInputValue(text)}
      />

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={() => sendMessage(inputValue)}
        onFileAttach={setAttachment}
        attachment={attachment}
        isLoading={isLoading}
        language={language}
      />
    </div>
  )
}
