import { createClient } from '@/lib/supabase/client'
import type { ExtractedInvoice, ValidationFlag } from '@/lib/zatca-rules'

const supabase = createClient()

export interface ValidationSummary {
  total: number
  errors: number
  warnings: number
  infos: number
  passed: boolean
}

export interface ValidationResult {
  extracted: ExtractedInvoice
  flags: ValidationFlag[]
  summary: ValidationSummary
  language: string
}

export interface SavedValidation extends ValidationResult {
  id: string
  fileName: string | null
  filePath: string | null
  createdAt: string
}

const INVOICE_BUCKET = 'invoices'

/** Persist a validation result for the current user. Returns its id or null. */
export async function saveValidation(
  result: ValidationResult,
  fileName: string | null,
  clientId: string | null = null,
  file: File | null = null
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('invoice_validations')
    .insert({
      user_id: user.id,
      file_name: fileName,
      language: result.language,
      extracted: result.extracted,
      flags: result.flags,
      summary: result.summary,
      passed: result.summary.passed,
      ...(clientId ? { client_id: clientId } : {}),
    })
    .select('id')
    .single()

  if (error || !data) return null
  const id = data.id as string

  // Best-effort: stash the original file so the preview survives a reload.
  // Failures here (missing bucket/column before migration 0003) never block the save.
  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = `${user.id}/${id}.${ext}`
    const { error: upErr } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: true })
    if (!upErr) {
      await supabase.from('invoice_validations').update({ file_path: path }).eq('id', id)
    }
  }

  return id
}

export async function listValidations(
  clientId: string | null = null
): Promise<SavedValidation[]> {
  let query = supabase
    .from('invoice_validations')
    .select('id, file_name, file_path, language, extracted, flags, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  query = clientId ? query.eq('client_id', clientId) : query.is('client_id', null)

  const { data, error } = await query
  if (error || !data) return []
  return data.map((v) => ({
    id: v.id,
    fileName: v.file_name,
    filePath: v.file_path ?? null,
    language: v.language,
    extracted: v.extracted as ExtractedInvoice,
    flags: (v.flags ?? []) as ValidationFlag[],
    summary: v.summary as ValidationSummary,
    createdAt: v.created_at,
  }))
}

/** Signed URL (1h) for a stored invoice file, or null if unavailable. */
export async function getInvoiceFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(filePath, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function deleteValidation(id: string, filePath?: string | null): Promise<void> {
  if (filePath) await supabase.storage.from(INVOICE_BUCKET).remove([filePath])
  await supabase.from('invoice_validations').delete().eq('id', id)
}
