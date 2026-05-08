import type { Attachment } from '@/types/chat'
import type { Part } from '@google/generative-ai'

function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n')
  if (!lines.length) return { headers: [], rows: [] }
  const split = (line: string) =>
    line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) }
}

function summarizeCSV(text: string, name: string): string {
  const { headers, rows } = parseCSVText(text)

  const statsLines: string[] = []
  headers.forEach((header, i) => {
    const nums = rows.map((r) => parseFloat(r[i])).filter((v) => !isNaN(v))
    if (nums.length) {
      const sum = nums.reduce((a, b) => a + b, 0)
      statsLines.push(
        `  ${header}: min=${Math.min(...nums).toFixed(2)}, max=${Math.max(...nums).toFixed(2)}, sum=${sum.toFixed(2)}, avg=${(sum / nums.length).toFixed(2)}`
      )
    }
  })

  const sample = [headers, ...rows.slice(0, 10)]
    .map((r) => r.join(' | '))
    .join('\n')

  return [
    `[CSV File: ${name}]`,
    `Columns: ${headers.join(', ')}`,
    `Total rows: ${rows.length}`,
    '',
    'Column statistics (numeric columns):',
    statsLines.join('\n') || '  (no numeric columns)',
    '',
    `Sample (first ${Math.min(10, rows.length)} rows):`,
    sample,
  ].join('\n')
}

// Used in the chat route — works with already-processed Attachment objects
export function buildGeminiParts(
  userMessage: string,
  attachment?: Attachment | null
): Part[] {
  const parts: Part[] = []

  if (attachment) {
    if (attachment.kind === 'text') {
      const isCSV =
        attachment.name.toLowerCase().endsWith('.csv') ||
        attachment.mimeType === 'text/csv'
      parts.push({
        text: isCSV
          ? summarizeCSV(attachment.data, attachment.name)
          : `\n\n[Attached file: ${attachment.name}]\n\`\`\`\n${attachment.data}\n\`\`\``,
      })
    } else {
      parts.push({
        inlineData: { mimeType: attachment.mimeType, data: attachment.data },
      })
    }
  }

  if (userMessage) parts.push({ text: userMessage })

  return parts
}

// Used in the analyze route — works with raw File objects from FormData
export async function buildAnalysisParts(file: File): Promise<Part[]> {
  const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv'
  const isText =
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    isCSV
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'

  if (isCSV) {
    const text = await file.text()
    return [{ text: summarizeCSV(text, file.name) }]
  }

  if (isText) {
    const text = await file.text()
    return [{ text: `[File: ${file.name}]\n${text.slice(0, 500_000)}` }]
  }

  if (isImage || isPDF) {
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return [{ inlineData: { mimeType: file.type, data: base64 } }]
  }

  return [{ text: `[File: ${file.name}] (unsupported type: ${file.type})` }]
}
