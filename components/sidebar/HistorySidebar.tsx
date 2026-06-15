'use client'

import { useEffect, useState, useCallback } from 'react'
import { PlusCircle, MessageSquare, Trash2, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  listConversations,
  deleteConversation,
  type ConversationSummary,
} from '@/lib/chat-history'
import type { Language } from '@/types/chat'

interface HistorySidebarProps {
  language: Language
  activeId: string | null
  open: boolean
  refreshSignal: number
  onSelect: (id: string) => void
  onNew: () => void
  onClose: () => void
}

export function HistorySidebar({
  language,
  activeId,
  open,
  refreshSignal,
  onSelect,
  onNew,
  onClose,
}: HistorySidebarProps) {
  const isRtl = language === 'ar'
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setItems(await listConversations())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshSignal])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setItems((prev) => prev.filter((c) => c.id !== id))
    await deleteConversation(id)
    if (id === activeId) onNew()
  }

  const closedTransform = open
    ? 'translate-x-0'
    : isRtl
      ? 'translate-x-full'
      : '-translate-x-full'

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-30 w-72 bg-white border-e flex flex-col shrink-0 transition-transform duration-200 md:translate-x-0 ${closedTransform}`}
      >
        <div className="px-3 py-3 border-b flex items-center justify-between gap-2">
          <button
            onClick={onNew}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold bg-[#0D4F8C] hover:bg-[#0a3f73] text-white py-2 rounded-lg transition-colors"
          >
            <PlusCircle size={16} />
            {language === 'ar' ? 'محادثة جديدة' : 'New chat'}
          </button>
          <button onClick={onClose} className="md:hidden p-2 text-gray-500" aria-label="close">
            <X size={18} />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-0.5">
            {loading ? (
              <p className="text-xs text-gray-400 text-center py-6">…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                {language === 'ar' ? 'لا توجد محادثات بعد' : 'No conversations yet'}
              </p>
            ) : (
              items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-start text-sm transition-colors ${
                    c.id === activeId ? 'bg-[#0D4F8C]/10 text-[#0D4F8C]' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <MessageSquare size={15} className="shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <span
                    onClick={(e) => handleDelete(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    aria-label="delete"
                  >
                    <Trash2 size={14} />
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  )
}
