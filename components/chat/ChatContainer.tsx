'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Message, Attachment, Language } from '@/types/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { WelcomeScreen } from './WelcomeScreen'
import { createConversation, saveMessage, loadMessages } from '@/lib/chat-history'
import { parseCitations } from '@/lib/citations'

interface ChatContainerProps {
  language: Language
  isAuthenticated: boolean
  initialConversationId: string | null
  initialQuery?: string
  onConversationCreated: (id: string) => void
  onPersisted: () => void
  onLatestCitations?: (ids: string[]) => void
}

export function ChatContainer({
  language,
  isAuthenticated,
  initialConversationId,
  initialQuery,
  onConversationCreated,
  onPersisted,
  onLatestCitations,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversationId)
  const didAutoSend = useRef(false)

  // Load messages once, on mount. The parent remounts this component (via key)
  // when the user opens a different conversation or starts a new chat — so a
  // mount-only load is correct and avoids clobbering the live in-memory chat
  // when this component creates its own conversation mid-stream.
  useEffect(() => {
    let cancelled = false
    if (initialConversationId) {
      loadMessages(initialConversationId).then((msgs) => {
        if (!cancelled) setMessages(msgs)
      })
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Auto-send a query handed in from the dashboard ask box (once).
  useEffect(() => {
    if (!didAutoSend.current && initialQuery && initialQuery.trim()) {
      didAutoSend.current = true
      sendMessage(initialQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  // Report the latest assistant message's citations to the sources panel.
  useEffect(() => {
    if (!onLatestCitations) return
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isStreaming)
    onLatestCitations(lastAssistant ? parseCitations(lastAssistant.content).ids : [])
  }, [messages, onLatestCitations])

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
        <MessageList messages={messages} isLoading={isLoading} language={language} />
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
