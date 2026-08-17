import { beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/lib/database.types'
import { createAuthenticatedClient } from '@tests/testAuth'

describe('sales_by_name', () => {
  describe('as anon', () => {
    it('is denied by RLS', async () => {
      const { data, error } = await supabase.from('sales_by_name').select('*')

      expect(error?.code).toBe('42501')
      expect(data).toBeNull()
    })
  })

  describe('as authenticated', () => {
    let client: SupabaseClient<Database>

    beforeAll(async () => {
      client = await createAuthenticatedClient()
    })

    it('aggregates total value and deal count per name', async () => {
      const { data, error } = await client
        .from('sales_by_name')
        .select('*')
        .order('name', { ascending: true })

      expect(error).toBeNull()
      expect(data).toEqual([
        { name: 'Alice', "rep_id": "d0e6c672-7b30-492e-a889-1ea5bb384a60", total_value: 4200, deal_count: 1 },
        { name: 'John', "rep_id": "9f3ee674-d2e8-42e6-8191-02cf66be6116", total_value: 5500, deal_count: 2 },
        { name: 'Marcus', "rep_id": "bc9c349b-b342-4bf4-a533-ece67c059374", total_value: 5800, deal_count: 3 },
        { name: 'Priya', "rep_id": "d1944b6d-099b-4b95-9434-eab83aeeb215", total_value: 10300, deal_count: 2 },
      ])
    })
  })
})
