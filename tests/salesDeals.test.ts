import { beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/lib/database.types'
import {
  createAuthenticatedRepClient,
  createAuthenticatedTeamLeadClient,
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

        // A rep holds no UPDATE/DELETE-granting policy on sales_deals (only
        // team leads do, see below), so cleanup needs the service-role client
        // -- otherwise this silently leaves the row behind.
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

    describe('update/delete policy', () => {
      it('cannot update its own already-seeded deal', async () => {
        const { data, error } = await client
          .from('sales_deals')
          .update({ value: 999999 })
          .eq('id', 1)
          .select()

        expect(error).toBeNull()
        expect(data).toEqual([])

        const { data: unchanged } = await client
          .from('sales_deals')
          .select('value')
          .eq('id', 1)
          .single()
        expect(unchanged?.value).toBe(3000)
      })

      it('cannot delete its own already-seeded deal', async () => {
        const { data, error } = await client.from('sales_deals').delete().eq('id', 1).select()

        expect(error).toBeNull()
        expect(data).toEqual([])

        const { data: stillThere } = await client
          .from('sales_deals')
          .select('id')
          .eq('id', 1)
          .single()
        expect(stillThere?.id).toBe(1)
      })
    })
  })

  describe('as authenticated team lead', () => {
    let client: SupabaseClient<Database>

    beforeAll(async () => {
      client = await createAuthenticatedTeamLeadClient()
    })

    it('can insert, update, and delete a deal on behalf of another rep', async () => {
      const { data: inserted, error: insertError } = await client
        .from('sales_deals')
        .insert({ rep_id: REP_ID, value: 100 })
        .select()
        .single()

      expect(insertError).toBeNull()
      expect(inserted?.rep_id).toBe(REP_ID)

      const { data: updated, error: updateError } = await client
        .from('sales_deals')
        .update({ value: 250 })
        .eq('id', inserted!.id)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updated?.value).toBe(250)

      const { error: deleteError } = await client
        .from('sales_deals')
        .delete()
        .eq('id', inserted!.id)

      expect(deleteError).toBeNull()

      const { data: afterDelete } = await client
        .from('sales_deals')
        .select('id')
        .eq('id', inserted!.id)
      expect(afterDelete).toEqual([])
    })
  })
})
