import { describe, expect, it } from 'vitest'
import { supabase } from '@/lib/supabaseClient'

describe('sales_by_name', () => {
  it('aggregates total value and deal count per name', async () => {
    const { data, error } = await supabase
      .from('sales_by_name')
      .select('*')
      .order('name', { ascending: true })

    expect(error).toBeNull()
    expect(data).toEqual([
      { name: 'Alice', total_value: 4200, deal_count: 1 },
      { name: 'John', total_value: 5500, deal_count: 2 },
      { name: 'Marcus', total_value: 5800, deal_count: 3 },
      { name: 'Priya', total_value: 10300, deal_count: 2 },
    ])
  })
})
