import { describe, expect, it } from 'vitest'
import { supabase } from '@/lib/supabaseClient'
import {
  createAuthenticatedRepClient,
  createAuthenticatedTeamLeadClient,
  createServiceRoleClient,
} from '@tests/testAuth'

function freshEmail() {
  return `invite-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
}

describe('invite-user', () => {
  it('denies an unauthenticated request', async () => {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email: freshEmail(), fullName: 'Nobody', role: 'rep' },
    })

    expect(data).toBeNull()
    expect(error?.context?.status).toBe(401)
  })

  it('denies a non-team-lead caller', async () => {
    const client = await createAuthenticatedRepClient()

    const { data, error } = await client.functions.invoke('invite-user', {
      body: { email: freshEmail(), fullName: 'Nobody', role: 'rep' },
    })

    expect(data).toBeNull()
    expect(error?.context?.status).toBe(403)
  })

  describe('as team lead', () => {
    it('invites a new rep', async () => {
      const client = await createAuthenticatedTeamLeadClient()
      const serviceClient = createServiceRoleClient()
      const email = freshEmail()

      const { data, error } = await client.functions.invoke('invite-user', {
        body: { email, fullName: 'New Rep', role: 'rep' },
      })

      expect(error).toBeNull()
      expect(data).toEqual({ ok: true })

      const {
        data: { users },
      } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
      const created = users.find((u) => u.email === email)
      expect(created).toBeDefined()
      expect(created?.user_metadata).toEqual({ full_name: 'New Rep', role: 'rep' })

      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', created!.id)
        .single()
      expect(profile).toEqual({ full_name: 'New Rep', role: 'rep' })

      // rollback
      await serviceClient.auth.admin.deleteUser(created!.id)
    })

    it('invites a new team lead', async () => {
      const client = await createAuthenticatedTeamLeadClient()
      const serviceClient = createServiceRoleClient()
      const email = freshEmail()

      const { error } = await client.functions.invoke('invite-user', {
        body: { email, fullName: 'New Lead', role: 'team_lead' },
      })

      expect(error).toBeNull()

      const {
        data: { users },
      } = await serviceClient.auth.admin.listUsers({ perPage: 1000 })
      const created = users.find((u) => u.email === email)
      expect(created).toBeDefined()

      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role')
        .eq('id', created!.id)
        .single()
      expect(profile?.role).toBe('team_lead')

      // rollback
      await serviceClient.auth.admin.deleteUser(created!.id)
    })

    it('rejects a request missing required fields', async () => {
      const client = await createAuthenticatedTeamLeadClient()

      const { data, error } = await client.functions.invoke('invite-user', {
        body: { email: freshEmail(), role: 'rep' },
      })

      expect(data).toBeNull()
      expect(error?.context?.status).toBe(400)
    })

    it('rejects an invalid role', async () => {
      const client = await createAuthenticatedTeamLeadClient()

      const { data, error } = await client.functions.invoke('invite-user', {
        body: { email: freshEmail(), fullName: 'Someone', role: 'bogus' },
      })

      expect(data).toBeNull()
      expect(error?.context?.status).toBe(400)
    })

    it('surfaces an error when the email is already in use', async () => {
      const client = await createAuthenticatedTeamLeadClient()

      const { data, error } = await client.functions.invoke('invite-user', {
        body: { email: 'marcus@salesdash.com', fullName: 'Marcus', role: 'rep' },
      })

      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })
  })
})
