'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Language } from '@/types/chat'

type Mode = 'login' | 'signup'

const t = {
  ar: {
    title: 'محاسب السعودية',
    subtitle: 'سجّل الدخول لحفظ محادثاتك وفواتيرك',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    continue: 'متابعة',
    google: 'المتابعة عبر Google',
    or: 'أو',
    back: 'العودة',
    checkEmail: 'تحقق من بريدك الإلكتروني لتأكيد حسابك.',
    badCreds: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    pwTooShort: 'يجب أن تتكوّن كلمة المرور من 6 أحرف على الأقل.',
    confirmFailed: 'تعذّر تأكيد البريد الإلكتروني. حاول مرة أخرى.',
    noAccount: 'ليس لديك حساب؟',
    haveAccount: 'لديك حساب بالفعل؟',
  },
  en: {
    title: 'Saudi Accountant',
    subtitle: 'Sign in to save your chats and invoices',
    login: 'Log in',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    continue: 'Continue',
    google: 'Continue with Google',
    or: 'or',
    back: 'Back',
    checkEmail: 'Check your email to confirm your account.',
    badCreds: 'Invalid email or password.',
    pwTooShort: 'Password must be at least 6 characters.',
    confirmFailed: 'Could not confirm your email. Please try again.',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [language, setLanguage] = useState<Language>('ar')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isRtl = language === 'ar'
  const tr = t[language]

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
    document.documentElement.dir = (saved ?? 'ar') === 'ar' ? 'rtl' : 'ltr'

    if (new URLSearchParams(window.location.search).get('error') === 'confirm') {
      setError(t[saved ?? 'ar'].confirmFailed)
    }

    // Already signed in? Go home.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/')
    })
  }, [supabase, router])

  const handleEmailAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setNotice('')

      if (password.length < 6) {
        setError(tr.pwTooShort)
        return
      }

      setLoading(true)
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        })
        setLoading(false)
        if (error) {
          setError(error.message)
        } else if (data.session) {
          // Email confirmation disabled — logged in immediately.
          router.replace('/')
        } else {
          setNotice(tr.checkEmail)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) {
          setError(error.message.includes('Invalid') ? tr.badCreds : error.message)
        } else {
          router.replace('/')
        }
      }
    },
    [mode, email, password, supabase, router, tr]
  )

  const handleGoogle = useCallback(async () => {
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }, [supabase])

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh flex flex-col items-center justify-center bg-[#F8F9FA] px-4 py-10"
    >
      <Link
        href="/"
        className="self-start mb-6 flex items-center gap-1.5 text-sm text-[#0D4F8C] hover:underline"
      >
        <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
        {tr.back}
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#C49A1A] flex items-center justify-center text-white font-bold text-2xl mb-3">
            م
          </div>
          <h1 className="text-lg font-bold text-[#0D4F8C]">{tr.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{tr.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-lg p-1 mb-5">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setError('')
                setNotice('')
              }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === m ? 'bg-white text-[#0D4F8C] shadow-sm' : 'text-gray-500'
              }`}
            >
              {m === 'login' ? tr.login : tr.signup}
            </button>
          ))}
        </div>

        {/* Email / password */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="relative">
            <Mail
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tr.email}
              className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D4F8C]/30 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
            />
          </div>
          <div className="relative">
            <Lock
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tr.password}
              className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D4F8C]/30 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D4F8C] hover:bg-[#0a3f73] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? tr.login : tr.signup}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-400">{tr.or}</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full border border-gray-200 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <GoogleIcon />
          {tr.google}
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
