'use client'

import { Message, Attachment, Language } from '@/types/chat'
import { cn } from '@/lib/utils'
import { FileText, Image as ImageIcon, File, BookOpen, ExternalLink } from 'lucide-react'
import { parseCitations, getCitations } from '@/lib/citations'

interface MessageBubbleProps {
  message: Message
  language: Language
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentBadge({ attachment, isUser }: { attachment: Attachment; isUser: boolean }) {
  const Icon = attachment.kind === 'pdf' ? FileText : attachment.kind === 'image' ? ImageIcon : File

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs mb-2 border w-fit',
        isUser
          ? 'bg-white/15 border-white/20 text-white'
          : 'bg-primary/8 border-primary/20 text-primary'
      )}
    >
      <Icon size={12} className="shrink-0" />
      <span className="truncate max-w-[160px] font-medium">{attachment.name}</span>
      <span className="opacity-60 shrink-0">{formatBytes(attachment.size)}</span>
    </div>
  )
}

function formatContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    line = line.replace(/`(.+?)`/g, '<code class="bg-black/10 px-1 rounded text-sm font-mono">$1</code>')

    if (line.startsWith('### ')) return <h4 key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</h4>
    if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h3>
    if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
    }

    const numMatch = line.match(/^(\d+)\.\s(.+)/)
    if (numMatch) {
      return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: numMatch[2] }} />
    }

    if (line.trim() === '') return <br key={i} />

    return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
  })
}

function Citations({ ids, language }: { ids: string[]; language: Language }) {
  const citations = getCitations(ids)
  if (citations.length === 0) return null
  const isAr = language === 'ar'

  return (
    <div className="mt-3 pt-2.5 border-t border-border">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
        <BookOpen size={12} />
        {isAr ? 'المصادر' : 'Sources'}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs bg-primary/8 hover:bg-primary/15 text-primary px-2 py-1 rounded-md transition-colors"
          >
            {isAr ? c.titleAr : c.titleEn}
            <ExternalLink size={10} className="opacity-60" />
          </a>
        ))}
      </div>
    </div>
  )
}

export function MessageBubble({ message, language }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const { text, ids } = isUser
    ? { text: message.content, ids: [] as string[] }
    : parseCitations(message.content)

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-semibold shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
        )}
      >
        {isUser ? '👤' : 'م'}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-se-none'
            : 'bg-card border border-border rounded-ss-none text-foreground'
        )}
      >
        {/* Attachment badge */}
        {message.attachment && (
          <AttachmentBadge attachment={message.attachment} isUser={isUser} />
        )}

        {/* Message text */}
        {isUser ? (
          message.content && (
            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )
        ) : (
          <div className="prose-sm">{formatContent(text)}</div>
        )}

        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-current opacity-70 animate-pulse ms-1 align-middle" />
        )}

        {/* Verified source citations (assistant only) */}
        {!isUser && !message.isStreaming && ids.length > 0 && (
          <Citations ids={ids} language={language} />
        )}
      </div>
    </div>
  )
}
