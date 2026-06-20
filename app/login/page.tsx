'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/use-theme'
import type { Language } from '@/types/chat'

type Mode = 'login' | 'signup'

const t = {
  ar: {
    heroTitle: 'إجابات محاسبية سعودية يمكنك الوثوق بها.',
    heroSub: 'الزكاة، ضريبة القيمة المضافة، IFRS، والفوترة الإلكترونية — كل إجابة موثّقة بمصدرها الرسمي.',
    trustLabel: 'يستند إلى المصادر الرسمية',
    einvoice: 'الفوترة الإلكترونية',
    rights: 'جميع الحقوق محفوظة',
    signInTitle: 'تسجيل الدخول',
    signUpTitle: 'إنشاء حساب',
    signInSub: 'مرحبًا بعودتك',
    signUpSub: 'ابدأ خلال دقيقة',
    google: 'المتابعة باستخدام Google',
    orEmail: 'أو تابع بالبريد الإلكتروني',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    show: 'إظهار',
    hide: 'إخفاء',
    remember: 'تذكّرني',
    forgot: 'نسيت كلمة المرور؟',
    signInBtn: 'تسجيل الدخول',
    signUpBtn: 'إنشاء حساب',
    haveAccount: 'لديك حساب؟',
    noAccount: 'جديد على محاسب؟',
    createAccount: 'أنشئ حسابًا',
    login: 'تسجيل الدخول',
    disclaimer: 'للتوجيه العام فقط. تحقق دائمًا من المصادر الرسمية للقرارات الحرجة.',
    checkEmail: 'تحقق من بريدك الإلكتروني لتأكيد حسابك.',
    badCreds: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    pwTooShort: 'يجب أن تتكوّن كلمة المرور من 6 أحرف على الأقل.',
    confirmFailed: 'تعذّر تأكيد البريد الإلكتروني. حاول مرة أخرى.',
  },
  en: {
    heroTitle: 'Saudi accounting answers you can actually trust.',
    heroSub: 'Zakat, VAT, IFRS and e-invoicing — every answer cites its official source.',
    trustLabel: 'GROUNDED IN OFFICIAL SOURCES',
    einvoice: 'E-invoicing',
    rights: 'All rights reserved',
    signInTitle: 'Sign in',
    signUpTitle: 'Create account',
    signInSub: 'Welcome back',
    signUpSub: 'Get started in a minute',
    google: 'Continue with Google',
    orEmail: 'or continue with email',
    email: 'Email',
    password: 'Password',
    show: 'Show',
    hide: 'Hide',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    signInBtn: 'Sign in',
    signUpBtn: 'Create account',
    haveAccount: 'Already have an account?',
    noAccount: 'New to محاسب?',
    createAccount: 'Create an account',
    login: 'Sign in',
    disclaimer: 'General guidance only. Always verify official sources for critical decisions.',
    checkEmail: 'Check your email to confirm your account.',
    badCreds: 'Invalid email or password.',
    pwTooShort: 'Password must be at least 6 characters.',
    confirmFailed: 'Could not confirm your email. Please try again.',
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const { theme, toggleTheme } = useTheme()
  const [language, setLanguage] = useState<Language>('ar')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isRtl = language === 'ar'
  const tr = t[language]
  const isSignup = mode === 'signup'

  useEffect(() => {
    const saved = localStorage.getItem('sa-lang') as Language | null
    if (saved === 'ar' || saved === 'en') setLanguage(saved)
    document.documentElement.dir = (saved ?? 'ar') === 'ar' ? 'rtl' : 'ltr'

    if (new URLSearchParams(window.location.search).get('error') === 'confirm') {
      setError(t[saved ?? 'ar'].confirmFailed)
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/')
    })
  }, [supabase, router])

  const toggleLang = () => {
    setLanguage((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar'
      localStorage.setItem('sa-lang', next)
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
      return next
    })
  }

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
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        })
        setLoading(false)
        if (error) setError(error.message)
        else if (data.session) router.replace('/')
        else setNotice(tr.checkEmail)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) setError(error.message.includes('Invalid') ? tr.badCreds : error.message)
        else router.replace('/')
      }
    },
    [isSignup, email, password, supabase, router, tr]
  )

  const handleGoogle = useCallback(async () => {
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }, [supabase])

  const fieldCls =
    'w-full h-12 rounded-[10px] border border-border bg-card text-foreground px-3.5 text-[15px] focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/40'
  const labelCls =
    'block text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-1.5'

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh flex bg-background text-foreground font-sans"
    >
      {/* floating controls */}
      <div className="fixed top-[18px] end-[18px] z-50 flex items-center gap-1.5 bg-card border border-border rounded-[13px] px-2.5 py-1.5 shadow-lg">
        <button
          onClick={toggleLang}
          className="min-w-[34px] text-center text-[13px] font-semibold border border-border rounded-lg px-2 py-1.5"
        >
          {language === 'en' ? 'ع' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="min-w-[34px] text-center text-sm border border-border rounded-lg px-2 py-1.5"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      {/* BRAND PANEL */}
      <div className="hidden md:flex flex-[0_0_46%] bg-panel text-panel-foreground px-[60px] py-[52px] flex-col relative overflow-hidden">
        <div className="absolute -bottom-[160px] -end-[120px] w-[420px] h-[420px] rounded-full border border-white/10" />
        <div className="absolute -bottom-[60px] -end-[40px] w-[260px] h-[260px] rounded-full border border-white/10" />

        <div className="relative flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-[13px] bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-semibold">
            م
          </div>
          <div className="leading-tight">
            <div className="text-[22px] font-semibold">محاسب</div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-panel-muted mt-0.5">MAHASIB</div>
          </div>
        </div>

        <div className="relative mt-auto">
          <div className="text-[34px] leading-[1.22] font-semibold max-w-[18ch] text-pretty">
            {tr.heroTitle}
          </div>
          <div className="text-base leading-relaxed text-panel-muted mt-[18px] max-w-[42ch]">
            {tr.heroSub}
          </div>
        </div>

        <div className="relative mt-10">
          <div className="font-mono text-[10px] tracking-[0.2em] text-panel-muted mb-3">
            {tr.trustLabel}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {['ZATCA', 'GAZT', 'IFRS', tr.einvoice].map((c) => (
              <span
                key={c}
                className="text-[13px] font-medium bg-white/10 border border-white/20 rounded-full px-3 py-1.5"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-10 text-xs text-panel-muted">© 2026 محاسب · {tr.rights}</div>
      </div>

      {/* FORM */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[404px]">
          {/* mobile wordmark */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-[13px] bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
              م
            </div>
            <div className="leading-tight">
              <div className="text-xl font-semibold">محاسب</div>
              <div className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground mt-0.5">MAHASIB</div>
            </div>
          </div>

          <div className="text-[26px] font-semibold leading-tight">
            {isSignup ? tr.signUpTitle : tr.signInTitle}
          </div>
          <div className="text-[15px] text-muted-foreground mt-1.5">
            {isSignup ? tr.signUpSub : tr.signInSub}
          </div>

          {/* google */}
          <button
            onClick={handleGoogle}
            className="cursor-pointer mt-[30px] h-[50px] w-full border border-border bg-card rounded-[11px] flex items-center justify-center gap-3 text-[15px] font-medium hover:bg-muted transition-colors"
          >
            <GoogleIcon />
            {tr.google}
          </button>

          {/* divider */}
          <div className="flex items-center gap-3.5 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{tr.orEmail}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailAuth}>
            <div className="mb-4">
              <label className={labelCls}>{tr.email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.sa"
                className={fieldCls}
              />
            </div>

            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>{tr.password}</label>
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="text-xs font-medium text-primary"
                >
                  {showPw ? tr.hide : tr.show}
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={fieldCls}
              />
            </div>

            {!isSignup && (
              <div className="flex items-center justify-between mb-5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" />
                  {tr.remember}
                </label>
                <span className="text-sm font-medium text-primary cursor-pointer">{tr.forgot}</span>
              </div>
            )}

            {error && <p className="text-sm text-destructive mb-3">{error}</p>}
            {notice && <p className="text-sm text-primary mb-3">{notice}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`${isSignup ? 'mt-1' : ''} h-[50px] w-full rounded-[11px] bg-primary text-primary-foreground flex items-center justify-center gap-2 text-base font-semibold disabled:opacity-60 hover:brightness-95 transition`}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isSignup ? tr.signUpBtn : tr.signInBtn}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-6">
            {isSignup ? tr.haveAccount : tr.noAccount}{' '}
            <button
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup')
                setError('')
                setNotice('')
              }}
              className="text-primary font-semibold"
            >
              {isSignup ? tr.login : tr.createAccount}
            </button>
          </div>

          <div className="text-center text-[11px] leading-relaxed text-muted-foreground mt-6 max-w-[34ch] mx-auto">
            {tr.disclaimer}
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  )
}
