import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type SalesByNameData = {
  name: string
  repId: string
  value: number
  dealCount: number
}[]

export function useSalesByName() {
  const [data, setData] = useState<SalesByNameData>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let currentController: AbortController | null = null

    async function fetchSalesByName() {
      currentController?.abort()
      const controller = new AbortController()
      currentController = controller

      setLoading(true)
      setError(null)

      const { data: rows, error: fetchError } = await supabase
        .from('sales_by_name')
        .select('*')
        .not('name', 'is', null)
        .not('rep_id', 'is', null)
        .not('total_value', 'is', null)
        .not('deal_count', 'is', null)
        .abortSignal(controller.signal)

      if (controller.signal.aborted || cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        const normalized: SalesByNameData = rows.map((row) => ({
          name: row.name,
          repId: row.rep_id,
          value: row.total_value,
          dealCount: row.deal_count,
        }))
        setData(normalized)
      }
      setLoading(false)
    }

    fetchSalesByName()

    const channel = supabase
      .channel('sales-deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_deals' }, () => {
        fetchSalesByName()
      })
      .subscribe((status) => {
        if (cancelled) return
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Lost connection to live sales updates.')
        }
      })

    return () => {
      cancelled = true
      currentController?.abort()
      supabase.removeChannel(channel)
    }
  }, [])

  return { data, loading, error }
}
