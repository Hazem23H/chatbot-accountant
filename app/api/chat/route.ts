import { genAI } from '@/lib/gemini'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'
import { Attachment, Language, TopicId } from '@/types/chat'
import { Part } from '@google/generative-ai'

interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
  attachment?: Attachment
}

interface RequestBody {
  messages: ApiMessage[]
  language: Language
  topicId: TopicId | null
}

function buildParts(msg: ApiMessage): Part[] {
  const parts: Part[] = []

  if (msg.content) {
    parts.push({ text: msg.content })
  }

  if (msg.attachment) {
    if (msg.attachment.kind === 'text') {
      // CSV / TXT — inject as readable text block
      parts.push({
        text: `\n\n[Attached file: ${msg.attachment.name}]\n\`\`\`\n${msg.attachment.data}\n\`\`\``,
      })
    } else {
      // PDF or image — send as inline binary data
      parts.push({
        inlineData: {
          mimeType: msg.attachment.mimeType,
          data: msg.attachment.data,
        },
      })
    }
  }

  return parts
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()
    const { messages, language, topicId } = body

    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 })
    }

    const langHint =
      language === 'ar'
        ? '\n\nNote: The user prefers Arabic. Always respond in Arabic unless they explicitly write in English.'
        : '\n\nNote: The user prefers English. Always respond in English unless they explicitly write in Arabic.'

    const topicHint = topicId
      ? `\n\nThe user is currently focused on this topic area: "${topicId}". Tailor your response to this domain when relevant.`
      : ''

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: SYSTEM_PROMPT + langHint + topicHint,
    })

    // History = all messages except the last one
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : ('user' as const),
      parts: buildParts(msg),
    }))

    const lastMessage = messages[messages.length - 1]
    const lastParts = buildParts(lastMessage)

    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(lastParts)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(new TextEncoder().encode(text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
