import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Seeded demo users (supabase/seed.sql) all use the password `<name>123`.
export const REP_ID = '9f3ee674-d2e8-42e6-8191-02cf66be6116' // John
export const TEAM_LEAD_ID = 'd0e6c672-7b30-492e-a889-1ea5bb384a60' // Alice

async function signIn(email: string, password: string) {
  const client = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )

  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw error
  }

  return client
}

export function createAuthenticatedRepClient() {
  return signIn('john@salesdash.com', 'john123')
}

export function createAuthenticatedTeamLeadClient() {
  return signIn('alice@salesdash.com', 'alice123')
}

// RLS-bypassing client for test cleanup only -- never use this to assert
// authorization behavior, only to tear down rows a test itself created that the
// `authenticated` role has no grant to delete/update (e.g. sales_deals has no
// DELETE grant for authenticated -- it was never meant to be user-deletable).
export function createServiceRoleClient() {
  return createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.SUPABASE_SECRET_KEY,
  )
}
