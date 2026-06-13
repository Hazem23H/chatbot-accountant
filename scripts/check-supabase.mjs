// Quick connectivity + schema check. Run: node scripts/check-supabase.mjs
// Loads env from .env.local and verifies the Supabase project responds and
// the expected tables exist.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Minimal .env.local loader (no extra deps)
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !(serviceKey || anonKey)) {
  console.error('❌ Missing env vars. Fill NEXT_PUBLIC_SUPABASE_URL and a key in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey || anonKey, {
  auth: { persistSession: false },
})

const tables = ['conversations', 'messages', 'invoice_validations', 'usage_events']
let ok = true

console.log(`Connecting to ${url} ...`)
for (const t of tables) {
  const { error } = await supabase.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    ok = false
    console.log(`  ✗ ${t.padEnd(20)} ${error.message}`)
  } else {
    console.log(`  ✓ ${t.padEnd(20)} reachable`)
  }
}

if (ok) {
  console.log('\n✅ Connection works and all tables exist.')
} else {
  console.log('\n⚠️  Connected, but some tables are missing — run supabase/migrations/0001_init.sql in the SQL Editor.')
  process.exit(2)
}
