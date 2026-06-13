import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// This Next.js version renamed the `middleware` convention to `proxy`.
// Runs on every matched request to keep the Supabase auth session fresh.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static, _next/image
     * - favicon.ico and common image files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
