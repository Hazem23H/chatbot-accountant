import { createClient } from '@/lib/supabase/client'
import type { Message, Attachment, Language } from '@/types/chat'

const supabase = createClient()

export interface ConversationSummary {
  id: string
  title: string
  language: Language
  updatedAt: string
}

interface MessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachment: Attachment | null
  created_at: string
}

/** Drop the heavy base64 payload before persisting — keep only metadata so
 *  restored chats can show the attachment name without bloating the row. */
function lightAttachment(att?: Attachment): Partial<Attachment> | null {
  if (!att) return null
  const { name, mimeType, size, kind } = att
  return { name, mimeType, size, kind }
}

export async function listConversations(
  clientId: string | null = null
): Promise<ConversationSummary[]> {
  let query = supabase
    .from('conversations')
    .select('id, title, language, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)
  query = clientId ? query.eq('client_id', clientId) : query.is('client_id', null)

  const { data, error } = await query
  if (error || !data) return []
  return data.map((c) => ({
    id: c.id,
    title: c.title,
    language: c.language as Language,
    updatedAt: c.updated_at,
  }))
}

/** Creates a conversation owned by the current user. Returns its id or null. */
export async function createConversation(
  title: string,
  language: Language,
  clientId: string | null = null
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const trimmed = title.trim().slice(0, 60) || 'New chat'
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title: trimmed, language, ...(clientId ? { client_id: clientId } : {}) })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

export async function saveMessage(
  conversationId: string,
  message: Pick<Message, 'role' | 'content' | 'attachment'>
): Promise<void> {
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: message.role,
    content: message.content,
    attachment: lightAttachment(message.attachment),
  })
  // Bump the conversation so it sorts to the top of the history list.
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

export async function loadMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, attachment, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return (data as MessageRow[]).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at),
    attachment: m.attachment ?? undefined,
  }))
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await supabase.from('conversations').delete().eq('id', conversationId)
}
