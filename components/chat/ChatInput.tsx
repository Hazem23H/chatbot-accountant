'use client'

import { useRef, KeyboardEvent, ChangeEvent } from 'react'
import { Send, Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { Language, Attachment } from '@/types/chat'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.csv,.txt'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onFileAttach: (attachment: Attachment | null) => void
  attachment: Attachment | null
  isLoading: boolean
  language: Language
}

function fileKind(mimeType: string): Attachment['kind'] {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  return 'text'
}

function AttachmentIcon({ kind }: { kind: Attachment['kind'] }) {
  if (kind === 'pdf') return <FileText size={14} className="shrink-0" />
  if (kind === 'image') return <ImageIcon size={14} className="shrink-0" />
  return <File size={14} className="shrink-0" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onFileAttach,
  attachment,
  isLoading,
  language,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) onSend()
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so same file can be re-selected
    e.target.value = ''

    if (file.size > MAX_BYTES) {
      alert(language === 'ar' ? `حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)` : `File exceeds 10 MB limit`)
      return
    }

    const kind = fileKind(file.type)

    if (kind === 'text') {
      const text = await file.text()
      onFileAttach({ name: file.name, mimeType: file.type || 'text/plain', data: text, size: file.size, kind })
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the data URL prefix ("data:...;base64,")
        const base64 = result.split(',')[1]
        onFileAttach({ name: file.name, mimeType: file.type, data: base64, size: file.size, kind })
      }
      reader.readAsDataURL(file)
    }
  }

  const canSend = !isLoading && (value.trim().length > 0 || attachment !== null)

  const placeholder =
    language === 'ar'
      ? 'اكتب سؤالك عن المحاسبة السعودية...'
      : 'Ask a question about Saudi accounting...'

  return (
    <div className="border-t bg-white px-4 py-3">
      {/* Attachment preview strip */}
      {attachment && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex items-center gap-2 bg-[#0D4F8C]/8 border border-[#0D4F8C]/20 rounded-lg px-3 py-1.5 text-[#0D4F8C] text-xs max-w-full">
            <AttachmentIcon kind={attachment.kind} />
            <span className="truncate max-w-[180px] font-medium">{attachment.name}</span>
            <span className="text-[#0D4F8C]/50 shrink-0">{formatBytes(attachment.size)}</span>
          </div>
          <button
            onClick={() => onFileAttach(null)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title={language === 'ar' ? 'إزالة الملف' : 'Remove file'}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border px-3 py-2 focus-within:border-[#0D4F8C] transition-colors">
        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="text-gray-400 hover:text-[#0D4F8C] transition-colors disabled:opacity-40 pb-1 shrink-0"
          title={language === 'ar' ? 'إرفاق ملف' : 'Attach file'}
        >
          <Paperclip size={18} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400 py-1 max-h-[120px] disabled:opacity-50"
          style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
        />

        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-8 h-8 rounded-full bg-[#0D4F8C] hover:bg-[#0a3d6f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0 mb-0.5"
        >
          <Send size={14} className="text-white" />
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-1.5">
        {language === 'ar'
          ? 'يدعم PDF، الصور، CSV — حتى 10 ميجابايت • للتوجيه العام فقط'
          : 'Supports PDF, images, CSV — up to 10 MB • For general guidance only'}
      </p>
    </div>
  )
}
