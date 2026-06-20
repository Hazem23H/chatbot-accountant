'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Home, MessageSquare, Wrench, BookOpen, Menu, X } from 'lucide-react'
import { useTheme } from '@/lib/use-theme'
import { AuthButton } from '@/components/auth/AuthButton'
import type { Language } from '@/types/chat'

type NavKey = 'home' | 'chat' | 'tools' | 'library'

interface AppShellProps {
  active: NavKey
  language: Language
  onToggleLanguage: () => void
  /** Optional extra section in the sidebar (e.g. recent chats, tool list). */
  sidebarExtra?: ReactNode
  children: ReactNode
}

const NAV: { key: NavKey; href: string; icon: typeof Home; ar: string; en: string }[] = [
  { key: 'home', href: '/', icon: Home, ar: 'الرئيسية', en: 'Home' },
  { key: 'chat', href: '/chat', icon: MessageSquare, ar: 'اسأل الذكاء', en: 'Ask AI' },
  { key: 'tools', href: '/validator', icon: Wrench, ar: 'الأدوات', en: 'Tools' },
  { key: 'library', href: '#', icon: BookOpen, ar: 'المكتبة', en: 'Library' },
]

export function AppShell({
  active,
  language,
  onToggleLanguage,
  sidebarExtra,
  children,
}: AppShellProps) {
  const isRtl = language === 'ar'
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const closedTransform = open
    ? 'translate-x-0'
    : isRtl
      ? 'translate-x-full'
      : '-translate-x-full'

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="h-dvh flex bg-background text-foreground font-sans overflow-hidden"
    >
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/30 z-20 md:hidden" />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-30 w-[248px] bg-sidebar border-e border-border flex flex-col shrink-0 px-4 py-5 transition-transform duration-200 md:translate-x-0 ${closedTransform}`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 px-2 pb-5">
            <div className="w-[38px] h-[38px] rounded-[11px] bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold">
              م
            </div>
            <div className="leading-tight">
              <div className="text-[18px] font-semibold">محاسب</div>
              <div className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground mt-px">MAHASIB</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden p-2 text-muted-foreground" aria-label="close">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ key, href, icon: Icon, ar, en }) => {
            const isActive = key === active
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <Icon size={17} className={isActive ? '' : 'text-muted-foreground'} />
                {isRtl ? ar : en}
              </Link>
            )
          })}
        </nav>

        {sidebarExtra && (
          <>
            <div className="h-px bg-border mx-2 my-3.5" />
            <div className="flex-1 min-h-0 overflow-y-auto">{sidebarExtra}</div>
          </>
        )}

        <div className={`flex flex-col gap-3 pt-3.5 ${sidebarExtra ? '' : 'mt-auto'}`}>
          <div className="flex gap-2">
            <button
              onClick={onToggleLanguage}
              className="flex-1 text-center text-[13px] font-semibold border border-border rounded-[9px] py-2 hover:border-primary transition-colors"
            >
              {language === 'en' ? 'ع' : 'EN'}
            </button>
            <button
              onClick={toggleTheme}
              className="flex-1 text-center text-sm border border-border rounded-[9px] py-2 hover:border-primary transition-colors"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
          <AuthButton language={language} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setOpen(true)} aria-label="menu">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              م
            </div>
            <span className="font-semibold">محاسب</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex">{children}</div>
      </div>
    </div>
  )
}
