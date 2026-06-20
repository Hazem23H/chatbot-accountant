'use client'

import Link from 'next/link'
import { Language } from '@/types/chat'
import { PlusCircle, ShieldCheck, PanelLeft } from 'lucide-react'
import { AuthButton } from '@/components/auth/AuthButton'
import { useTheme } from '@/lib/use-theme'

interface HeaderProps {
  language: Language
  onToggleLanguage: () => void
  onNewChat: () => void
  showHistoryToggle?: boolean
  onToggleHistory?: () => void
}

export function Header({
  language,
  onToggleLanguage,
  onNewChat,
  showHistoryToggle,
  onToggleHistory,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const pill =
    'flex items-center gap-1.5 text-xs font-medium border border-border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors'

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border z-10">
      <div className="flex items-center gap-3">
        {showHistoryToggle && (
          <button
            onClick={onToggleHistory}
            className="md:hidden p-1.5 -ms-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label={language === 'ar' ? 'المحادثات' : 'Conversations'}
          >
            <PanelLeft size={20} />
          </button>
        )}
        <div className="w-9 h-9 rounded-[11px] bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xl">
          م
        </div>
        <div className="leading-tight">
          <h1 className="text-[17px] font-semibold">محاسب</h1>
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground mt-0.5">MAHASIB</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/validator" className={pill}>
          <ShieldCheck size={14} />
          <span className="hidden sm:inline">
            {language === 'ar' ? 'فحص الفاتورة' : 'Validate'}
          </span>
        </Link>

        <button onClick={onNewChat} className={pill}>
          <PlusCircle size={14} />
          <span className="hidden sm:inline">
            {language === 'ar' ? 'محادثة جديدة' : 'New chat'}
          </span>
        </button>

        <button
          onClick={onToggleLanguage}
          className="text-xs font-semibold border border-border rounded-full px-3 py-1.5 hover:border-primary transition-colors"
        >
          {language === 'ar' ? 'EN' : 'ع'}
        </button>

        <button
          onClick={toggleTheme}
          className="text-sm border border-border rounded-full w-8 h-8 flex items-center justify-center hover:border-primary transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <AuthButton language={language} />
      </div>
    </header>
  )
}
