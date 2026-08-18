import { beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/lib/database.types'
import {
  createAuthenticatedRepClient,
  createServiceRoleClient,
  REP_ID,
  TEAM_LEAD_ID,
} from '@tests/testAuth'

describe('sales_deals', () => {
  describe('as anon', () => {
    it('is denied by RLS', async () => {
      const { data, error } = await supabase.from('sales_deals').select('*')

      expect(error?.code).toBe('42501')
      expect(data).toBeNull()
    })
  })

  describe('as authenticated rep', () => {
    let client: SupabaseClient<Database>

    beforeAll(async () => {
      client = await createAuthenticatedRepClient()
    })

    it('returns all seeded deals', async () => {
      const { data, error } = await client
        .from('sales_deals')
        .select('*')
        .order('id', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(8)
    })

    it('includes a known seed row', async () => {
      const { data, error } = await client
        .from('sales_deals')
        .select('rep_id, value')
        .eq('id', 1)
        .single()

      expect(error).toBeNull()
      expect(data).toEqual({ rep_id: REP_ID, value: 3000 })
    })

    describe('insert policy', () => {
      it('allows inserting a deal under your own rep_id', async () => {
        const { data, error } = await client
          .from('sales_deals')
          .insert({ rep_id: REP_ID, value: 100 })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data?.rep_id).toBe(REP_ID)

        // authenticated has no DELETE grant on sales_deals, so cleanup needs the
        // service-role client -- otherwise this silently leaves the row behind.
        await createServiceRoleClient().from('sales_deals').delete().eq('id', data!.id)
      })

      it('denies inserting a deal under another rep_id', async () => {
        const { data, error } = await client
          .from('sales_deals')
          .insert({ rep_id: TEAM_LEAD_ID, value: 100 })
          .select()
          .single()

        expect(error?.code).toBe('42501')
        expect(data).toBeNull()
      })
    })
  })
})
