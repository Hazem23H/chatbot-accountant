import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth redirect target. Google sends the user back here with a `code` that we
// exchange for a session (cookies are written via the server client).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Respect the forwarded host when running behind a proxy / on Vercel.
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'
      if (isLocal) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // No code or exchange failed — bounce home with an error flag.
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
