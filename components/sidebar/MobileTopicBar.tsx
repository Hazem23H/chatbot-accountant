'use client'

import { TOPICS } from '@/lib/topics'
import { Language, TopicId } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MobileTopicBarProps {
  language: Language
  activeTopic: TopicId | null
  onTopicSelect: (topicId: TopicId) => void
}

export function MobileTopicBar({ language, activeTopic, onTopicSelect }: MobileTopicBarProps) {
  return (
    <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 bg-card border-b no-scrollbar">
      {TOPICS.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onTopicSelect(topic.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0',
            activeTopic === topic.id
              ? 'bg-primary text-white border-primary'
              : `${topic.color}`
          )}
        >
          <span>{topic.icon}</span>
          <span>{language === 'ar' ? topic.labelAr : topic.labelEn}</span>
        </button>
      ))}
    </div>
  )
}
