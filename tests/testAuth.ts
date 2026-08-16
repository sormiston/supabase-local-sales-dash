import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const TEST_EMAIL = 'integration-tests@example.com'
const TEST_PASSWORD = 'integration-tests-password'

export async function createAuthenticatedClient() {
  const client = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  )

  const { error: signInError } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (signInError) {
    const { error: signUpError } = await client.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (signUpError) {
      throw signUpError
    }
  }

  return client
}
