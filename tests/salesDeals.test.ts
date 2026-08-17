import { beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/lib/database.types'
import { createAuthenticatedClient } from '@tests/testAuth'

describe('sales_deals', () => {
  describe('as anon', () => {
    it('is denied by RLS', async () => {
      const { data, error } = await supabase.from('sales_deals').select('*')

      expect(error?.code).toBe('42501')
      expect(data).toBeNull()
    })
  })

  describe('as authenticated', () => {
    let client: SupabaseClient<Database>

    beforeAll(async () => {
      client = await createAuthenticatedClient()
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
      expect(data).toEqual({ rep_id: '9f3ee674-d2e8-42e6-8191-02cf66be6116', value: 3000 })
    })
  })
})
