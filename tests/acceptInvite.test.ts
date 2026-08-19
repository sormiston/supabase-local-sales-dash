import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { createAuthenticatedTeamLeadClient, createServiceRoleClient } from '@tests/testAuth'

// Local dev's email testing server, per `supabase start`'s printed MAILPIT_URL.
// Not derived from VITE_SUPABASE_URL since Mailpit isn't part of the Auth/PostgREST
// API surface -- hardcoded like the rest of this file's local-only assumptions.
const MAILPIT_URL = 'http://127.0.0.1:54324'

function freshEmail() {
  return `accept-invite-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
}

async function findInviteLink(email: string): Promise<{ tokenHash: string; type: string }> {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const searchRes = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    const { messages } = (await searchRes.json()) as { messages: { ID: string }[] }
    if (messages?.length > 0) {
      const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
      const { Text } = (await msgRes.json()) as { Text: string }
      const match = Text.match(/token_hash=([^&\s]+)&type=([^&\s]+)/)
      if (match) return { tokenHash: match[1], type: match[2] }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No invite email with a token_hash link found for ${email} within 5s`)
}

describe('accept-invite', () => {
  it('lets an invited user verify, set a password, and sign in with it', async () => {
    const client = await createAuthenticatedTeamLeadClient()
    const serviceClient = createServiceRoleClient()
    const email = freshEmail()

    const { error: inviteError } = await client.functions.invoke('invite-user', {
      body: { email, fullName: 'Invited Person', role: 'rep' },
    })
    expect(inviteError).toBeNull()

    const { tokenHash, type } = await findInviteLink(email)
    expect(type).toBe('invite')

    const plainClient = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )

    const { data: verifyData, error: verifyError } = await plainClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'invite',
    })
    expect(verifyError).toBeNull()
    expect(verifyData.session).not.toBeNull()

    const { error: updateError } = await plainClient.auth.updateUser({ password: 'newpassword123' })
    expect(updateError).toBeNull()

    await plainClient.auth.signOut()

    const { data: signInData, error: signInError } = await plainClient.auth.signInWithPassword({
      email,
      password: 'newpassword123',
    })
    expect(signInError).toBeNull()
    expect(signInData.session).not.toBeNull()

    await serviceClient.auth.admin.deleteUser(verifyData.user!.id)
  })
})
