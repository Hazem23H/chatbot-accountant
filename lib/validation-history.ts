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
  createdAt: string
}

/** Persist a validation result for the current user. Returns its id or null. */
export async function saveValidation(
  result: ValidationResult,
  fileName: string | null
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
    })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

export async function listValidations(): Promise<SavedValidation[]> {
  const { data, error } = await supabase
    .from('invoice_validations')
    .select('id, file_name, language, extracted, flags, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data.map((v) => ({
    id: v.id,
    fileName: v.file_name,
    language: v.language,
    extracted: v.extracted as ExtractedInvoice,
    flags: (v.flags ?? []) as ValidationFlag[],
    summary: v.summary as ValidationSummary,
    createdAt: v.created_at,
  }))
}

export async function deleteValidation(id: string): Promise<void> {
  await supabase.from('invoice_validations').delete().eq('id', id)
}
