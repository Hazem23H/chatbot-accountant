'use client'

import { Topic, Language } from '@/types/chat'
import { cn } from '@/lib/utils'

interface TopicCardProps {
  topic: Topic
  isActive: boolean
  language: Language
  onClick: () => void
}

export function TopicCard({ topic, isActive, language, onClick }: TopicCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-start transition-all',
        isActive
          ? 'bg-primary text-white border-primary shadow-sm'
          : `${topic.color} hover:opacity-80`
      )}
    >
      <span className="text-lg shrink-0">{topic.icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {language === 'ar' ? topic.labelAr : topic.labelEn}
        </p>
        <p className={cn('text-xs truncate', isActive ? 'text-blue-200' : 'opacity-60')}>
          {language === 'ar' ? topic.descriptionAr : topic.descriptionEn}
        </p>
      </div>
    </button>
  )
}
