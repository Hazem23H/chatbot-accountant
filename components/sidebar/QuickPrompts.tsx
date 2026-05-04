'use client'

import { QUICK_PROMPTS } from '@/lib/quick-prompts'
import { Language, TopicId } from '@/types/chat'

interface QuickPromptsProps {
  language: Language
  activeTopic: TopicId | null
  onPromptClick: (text: string) => void
}

export function QuickPrompts({ language, activeTopic, onPromptClick }: QuickPromptsProps) {
  const topic = activeTopic ?? 'general'
  const prompts = QUICK_PROMPTS[topic] ?? QUICK_PROMPTS.general

  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {prompts.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onPromptClick(language === 'ar' ? prompt.ar : prompt.en)}
          className="text-xs bg-white border border-[#0D4F8C]/20 text-[#0D4F8C] hover:bg-[#0D4F8C] hover:text-white transition-colors px-3 py-1.5 rounded-full text-start"
        >
          {language === 'ar' ? prompt.ar : prompt.en}
        </button>
      ))}
    </div>
  )
}
