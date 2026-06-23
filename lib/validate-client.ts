import type { ValidationResult } from '@/lib/validation-history'

export const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
]
export const MAX_BYTES = 10 * 1024 * 1024

/** Validate a single invoice file against the API. Throws on failure. */
export async function validateInvoiceFile(
  file: File,
  language: string,
  qrPayload?: string | null
): Promise<ValidationResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('language', language)
  if (qrPayload) formData.append('qrPayload', qrPayload)

  const res = await fetch('/api/validate-invoice', { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: ValidationResult & { error?: string } = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}
