'use client'

import { useEffect, useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Language } from '@/types/chat'

interface AuthButtonProps {
  language: Language
}

export function AuthButton({ language }: AuthButtonProps) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
  }

  if (user) {
    const name =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email ||
      ''
    const avatar = user.user_metadata?.avatar_url as string | undefined

    return (
      <div className="flex items-center gap-2">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={name}
            className="w-8 h-8 rounded-full border border-white/30"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#C49A1A] flex items-center justify-center text-sm font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <button
          onClick={signOut}
          title={language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">
            {language === 'ar' ? 'خروج' : 'Sign out'}
          </span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signIn}
      className="flex items-center gap-1.5 text-xs bg-[#C49A1A] hover:bg-[#b8891a] transition-colors px-3 py-1.5 rounded-full font-semibold"
    >
      <LogIn size={14} />
      <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</span>
    </button>
  )
}
