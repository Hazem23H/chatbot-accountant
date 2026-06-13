import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service-role key. BYPASSES Row Level
 * Security — never import this into client code or expose its results to the
 * browser without your own checks. Use it for trusted server work like
 * rate-limit bookkeeping where there may be no logged-in user.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
