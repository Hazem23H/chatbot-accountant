'use client'

import { Language } from '@/types/chat'
import { PlusCircle } from 'lucide-react'

interface HeaderProps {
  language: Language
  onToggleLanguage: () => void
  onNewChat: () => void
}

export function Header({ language, onToggleLanguage, onNewChat }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#0D4F8C] text-white shadow-md z-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#C49A1A] flex items-center justify-center text-white font-bold text-lg">
          م
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight">محاسب السعودية</h1>
          <p className="text-xs text-blue-200 leading-tight">Saudi Accountant AI</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full"
        >
          <PlusCircle size={14} />
          <span>{language === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
        </button>

        <button
          onClick={onToggleLanguage}
          className="text-xs font-semibold bg-[#C49A1A] hover:bg-[#b8891a] transition-colors px-3 py-1.5 rounded-full"
        >
          {language === 'ar' ? 'EN' : 'عر'}
        </button>
      </div>
    </header>
  )
}
