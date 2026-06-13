import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase auth session on each request and keeps the auth
 * cookies in sync between the browser and the server. Called from the root
 * `proxy.ts` (this Next.js version renamed `middleware` -> `proxy`).
 *
 * IMPORTANT: do not run logic between creating the client and calling
 * `getUser()`. And because proxy can be skipped on some paths, always
 * re-check auth inside Route Handlers — never rely on the proxy alone.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Touch the session so expired tokens get refreshed and cookies updated.
  await supabase.auth.getUser()

  return response
}
