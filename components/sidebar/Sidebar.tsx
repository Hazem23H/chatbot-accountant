'use client'

import { TOPICS } from '@/lib/topics'
import { Language, TopicId } from '@/types/chat'
import { TopicCard } from './TopicCard'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  language: Language
  activeTopic: TopicId | null
  onTopicSelect: (topicId: TopicId) => void
}

export function Sidebar({ language, activeTopic, onTopicSelect }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-72 border-e bg-white shrink-0">
      <div className="px-4 py-3 border-b">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {language === 'ar' ? 'المواضيع' : 'Topics'}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-1.5">
          {TOPICS.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isActive={activeTopic === topic.id}
              language={language}
              onClick={() => onTopicSelect(topic.id)}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="px-4 py-3 border-t">
        <p className="text-xs text-gray-400 text-center">
          {language === 'ar'
            ? 'تحقق دائمًا من المصادر الرسمية'
            : 'Always verify with official sources'}
        </p>
      </div>
    </aside>
  )
}
