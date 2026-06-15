'use client'

import { useState, useCallback, useEffect } from 'react'
import { Message, Attachment, Language } from '@/types/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { WelcomeScreen } from './WelcomeScreen'
import { createConversation, saveMessage, loadMessages } from '@/lib/chat-history'

interface ChatContainerProps {
  language: Language
  isAuthenticated: boolean
  conversationId: string | null
  onConversationCreated: (id: string) => void
  onPersisted: () => void
}

export function ChatContainer({
  language,
  isAuthenticated,
  conversationId,
  onConversationCreated,
  onPersisted,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId)

  // Load an existing conversation's messages when opened from history.
  useEffect(() => {
    let cancelled = false
    if (conversationId) {
      loadMessages(conversationId).then((msgs) => {
        if (!cancelled) setMessages(msgs)
      })
    }
    return () => {
      cancelled = true
    }
  }, [conversationId])

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
        const history = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
          attachment: m.attachment,
        }))

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, language, topicId: null }),
        })

        if (!response.ok || !response.body) throw new Error('Failed to get response')

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

        // Persist the exchange for signed-in users.
        if (isAuthenticated && accumulated) {
          let cid = activeConvId
          if (!cid) {
            cid = await createConversation(
              userMessage.content || attachment?.name || 'New chat',
              language
            )
            if (cid) {
              setActiveConvId(cid)
              onConversationCreated(cid)
            }
          }
          if (cid) {
            await saveMessage(cid, {
              role: 'user',
              content: userMessage.content,
              attachment: userMessage.attachment,
            })
            await saveMessage(cid, { role: 'assistant', content: accumulated })
            onPersisted()
          }
        }
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
    [
      messages,
      language,
      attachment,
      isLoading,
      isAuthenticated,
      activeConvId,
      onConversationCreated,
      onPersisted,
    ]
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {messages.length === 0 ? (
        <WelcomeScreen
          language={language}
          onQuestionClick={(q) => {
            setInputValue(q)
          }}
        />
      ) : (
        <MessageList messages={messages} isLoading={isLoading} />
      )}

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
