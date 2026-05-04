'use client'

import { Language } from '@/types/chat'
import { TOPICS } from '@/lib/topics'

interface WelcomeScreenProps {
  language: Language
  onTopicClick: (topicId: string) => void
}

export function WelcomeScreen({ language, onTopicClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#0D4F8C] flex items-center justify-center text-white text-3xl mb-4 shadow-lg">
        م
      </div>
      <h2 className="text-2xl font-bold text-[#0D4F8C] mb-2">
        {language === 'ar' ? 'مرحباً بك في محاسب السعودية' : 'Welcome to Saudi Accountant AI'}
      </h2>
      <p className="text-gray-500 text-sm max-w-md mb-8">
        {language === 'ar'
          ? 'مساعدك الذكي المتخصص في المحاسبة والمراجعة والضرائب في المملكة العربية السعودية. اسأل عن الزكاة، ضريبة القيمة المضافة، معايير IFRS، الفوترة الإلكترونية والمزيد.'
          : 'Your specialized AI assistant for Saudi Arabian accounting, auditing, and taxation. Ask about Zakat, VAT, IFRS, e-invoicing, and more.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
        {TOPICS.filter((t) => t.id !== 'general').slice(0, 6).map((topic) => (
          <button
            key={topic.id}
            onClick={() => onTopicClick(topic.id)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-start hover:shadow-md transition-all ${topic.color}`}
          >
            <span className="text-xl">{topic.icon}</span>
            <span className="text-xs font-medium">
              {language === 'ar' ? topic.labelAr : topic.labelEn}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-8 max-w-sm">
        {language === 'ar'
          ? '⚠️ تحقق دائمًا من التشريعات الرسمية لدى هيئة الزكاة والضريبة والجمارك وهيئة السوق المالية للقرارات الحرجة.'
          : '⚠️ Always verify critical compliance decisions with official ZATCA, SOCPA, or CMA sources.'}
      </p>
    </div>
  )
}
