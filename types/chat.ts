export type Language = 'ar' | 'en'
export type MessageRole = 'user' | 'assistant'
export type TopicId =
  | 'general'
  | 'zakat'
  | 'vat'
  | 'ifrs'
  | 'auditing'
  | 'corporate-law'
  | 'e-invoicing'
  | 'vision2030'
  | 'capital-markets'
  | 'banking'
  | 'government'

export interface Attachment {
  name: string
  mimeType: string
  data: string        // base64 for PDF/images; raw text for CSV/TXT
  size: number        // bytes
  kind: 'pdf' | 'image' | 'text'
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  attachment?: Attachment
  isStreaming?: boolean
}

export interface Topic {
  id: TopicId
  labelAr: string
  labelEn: string
  icon: string
  descriptionAr: string
  descriptionEn: string
  color: string
}

export interface QuickPrompt {
  ar: string
  en: string
}
