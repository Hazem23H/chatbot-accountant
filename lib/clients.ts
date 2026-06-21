import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Client {
  id: string
  name: string
  fiscalYear: string | null
}

/** `null` clientId means the General workspace (untagged rows). */
export type WorkspaceId = string | null

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, fiscal_year')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data.map((c) => ({ id: c.id, name: c.name, fiscalYear: c.fiscal_year }))
}

export async function createClientWorkspace(
  name: string,
  fiscalYear?: string
): Promise<Client | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clients')
    .insert({ user_id: user.id, name: name.trim(), fiscal_year: fiscalYear ?? null })
    .select('id, name, fiscal_year')
    .single()

  if (error || !data) return null
  return { id: data.id, name: data.name, fiscalYear: data.fiscal_year }
}

export async function deleteClientWorkspace(id: string): Promise<void> {
  await supabase.from('clients').delete().eq('id', id)
}
