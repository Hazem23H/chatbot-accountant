'use client'

import { Language } from '@/types/chat'

interface WelcomeScreenProps {
  language: Language
  onQuestionClick: (question: string) => void
}

const EXAMPLES = {
  ar: [
    'ما هي نسبة ضريبة القيمة المضافة وكيف أسجّل؟',
    'كيف أحسب وعاء الزكاة للشركة؟',
    'ما الفرق بين المرحلة الأولى والثانية للفوترة الإلكترونية؟',
    'ما معايير IFRS المطبّقة في المملكة العربية السعودية؟',
  ],
  en: [
    'What is the VAT rate and how do I register?',
    'How do I calculate the Zakat base for my company?',
    'What is the difference between e-invoicing Phase 1 and Phase 2?',
    'Which IFRS standards apply in Saudi Arabia?',
  ],
}

export function WelcomeScreen({ language, onQuestionClick }: WelcomeScreenProps) {
  const examples = EXAMPLES[language]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="w-14 h-14 rounded-[16px] bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold mb-4 shadow-sm">
        م
      </div>

      <h2 className="text-xl font-semibold mb-0.5 text-center">
        {language === 'ar' ? 'محاسب' : 'Mahasib'}
      </h2>
      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mb-3">MAHASIB</p>

      <p className="text-muted-foreground text-sm mb-8 text-center max-w-sm">
        {language === 'ar'
          ? 'اسألني عن الزكاة، ضريبة القيمة المضافة، IFRS، الفوترة الإلكترونية، والمزيد.'
          : 'Ask me about Zakat, VAT, IFRS, e-invoicing, and more.'}
      </p>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {examples.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(q)}
            className="text-start text-sm px-4 py-3 rounded-xl border border-primary/15 bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-8 text-center max-w-xs">
        {language === 'ar'
          ? 'تحقق دائمًا من المصادر الرسمية للقرارات الحرجة'
          : 'Always verify critical decisions with official sources'}
      </p>
    </div>
  )
}
