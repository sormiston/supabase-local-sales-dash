import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/lib/database.types'
import {
  createAuthenticatedRepClient,
  createAuthenticatedTeamLeadClient,
  REP_ID,
  TEAM_LEAD_ID,
} from '@tests/testAuth'

describe('user_profiles', () => {
  describe('as anon', () => {
    it('is denied by RLS', async () => {
      const { data, error } = await supabase.from('user_profiles').select('*')

      expect(error?.code).toBe('42501')
      expect(data).toBeNull()
    })
  })

  describe('as authenticated rep', () => {
    let client: SupabaseClient<Database>

    beforeAll(async () => {
      client = await createAuthenticatedRepClient()
    })

    it('reads profiles beyond its own row', async () => {
      // Not asserting an exact total count: this checks the open-read policy lets
      // a rep see another user's profile (here, the team lead's), without assuming
      // no other accounts exist locally beyond the seeded demo users.
      const { data, error } = await client.from('user_profiles').select('id').eq('id', TEAM_LEAD_ID)

      expect(error).toBeNull()
      expect(data).toEqual([{ id: TEAM_LEAD_ID }])
    })

    it('updates its own full_name', async () => {
      const { error: updateError } = await client
        .from('user_profiles')
        .update({ full_name: 'John Updated' })
        .eq('id', REP_ID)

      expect(updateError).toBeNull()

      const { data } = await client
        .from('user_profiles')
        .select('full_name')
        .eq('id', REP_ID)
        .single()

      expect(data?.full_name).toBe('John Updated')

      await client.from('user_profiles').update({ full_name: 'John' }).eq('id', REP_ID)
    })

    it("cannot update another user's full_name", async () => {
      const { data, error } = await client
        .from('user_profiles')
        .update({ full_name: 'Hijacked' })
        .eq('id', TEAM_LEAD_ID)
        .select()

      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('cannot update its own role', async () => {
      const { error } = await client
        .from('user_profiles')
        .update({ role: 'team_lead' })
        .eq('id', REP_ID)

      expect(error?.code).toBe('42501')
    })

    it('is_team_lead() returns false', async () => {
      const { data, error } = await client.rpc('is_team_lead')

      expect(error).toBeNull()
      expect(data).toBe(false)
    })

    it('set_user_role() denies self-promotion', async () => {
      const { error } = await client.rpc('set_user_role', {
        target_id: REP_ID,
        new_role: 'team_lead',
      })

      expect(error).not.toBeNull()
    })
  })

  describe('as authenticated team lead', () => {
    let client: SupabaseClient<Database>

    beforeAll(async () => {
      client = await createAuthenticatedTeamLeadClient()
    })

    afterEach(async () => {
      await client.rpc('set_user_role', { target_id: REP_ID, new_role: 'rep' })
    })

    it('is_team_lead() returns true', async () => {
      const { data, error } = await client.rpc('is_team_lead')

      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it("set_user_role() changes another user's role", async () => {
      const { error: rpcError } = await client.rpc('set_user_role', {
        target_id: REP_ID,
        new_role: 'team_lead',
      })

      expect(rpcError).toBeNull()

      const { data } = await client.from('user_profiles').select('role').eq('id', REP_ID).single()

      expect(data?.role).toBe('team_lead')
    })

    it('set_user_role() rejects an invalid role', async () => {
      const { error } = await client.rpc('set_user_role', {
        target_id: REP_ID,
        new_role: 'bogus',
      })

      expect(error).not.toBeNull()
    })
  })
})
