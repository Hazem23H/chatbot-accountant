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
      <div className="w-14 h-14 rounded-full bg-[#0D4F8C] flex items-center justify-center text-white text-2xl mb-4 shadow-md">
        م
      </div>

      <h2 className="text-xl font-bold text-[#0D4F8C] mb-1 text-center">
        {language === 'ar' ? 'محاسب السعودية' : 'Saudi Accountant AI'}
      </h2>

      <p className="text-gray-500 text-sm mb-8 text-center max-w-sm">
        {language === 'ar'
          ? 'اسألني عن الزكاة، ضريبة القيمة المضافة، IFRS، الفوترة الإلكترونية، والمزيد.'
          : 'Ask me about Zakat, VAT, IFRS, e-invoicing, and more.'}
      </p>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {examples.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(q)}
            className="text-start text-sm px-4 py-3 rounded-xl border border-[#0D4F8C]/15 bg-white hover:border-[#0D4F8C]/40 hover:bg-[#0D4F8C]/5 text-gray-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center max-w-xs">
        {language === 'ar'
          ? 'تحقق دائمًا من المصادر الرسمية للقرارات الحرجة'
          : 'Always verify critical decisions with official sources'}
      </p>
    </div>
  )
}
