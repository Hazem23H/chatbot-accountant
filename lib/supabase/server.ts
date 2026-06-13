import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Route Handlers, and Server Functions.
 * Reads/writes the auth session via Next.js cookies. RLS still applies — this
 * acts as the logged-in user, not as an admin.
 *
 * Note: in this Next.js version `cookies()` is async, so this helper is async.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll was called from a Server Component, where cookies are
            // read-only. Safe to ignore — the proxy refreshes the session.
          }
        },
      },
    }
  )
}
