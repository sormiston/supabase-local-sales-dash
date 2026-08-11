import { describe, expect, it } from 'vitest'
import { supabase } from '@/lib/supabaseClient'

describe('sales_deals', () => {
  it('returns all seeded deals', async () => {
    const { data, error } = await supabase
      .from('sales_deals')
      .select('*')
      .order('id', { ascending: true })

    expect(error).toBeNull()
    expect(data).toHaveLength(8)
  })

  it('includes a known seed row', async () => {
    const { data, error } = await supabase
      .from('sales_deals')
      .select('name, value')
      .eq('id', 1)
      .single()

    expect(error).toBeNull()
    expect(data).toEqual({ name: 'John', value: 3000 })
  })
})
