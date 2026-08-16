import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/lib/database.types'

type SalesByNameRow = Database['public']['Views']['sales_by_name']['Row']

interface UseSalesByNameResult {
  data: SalesByNameRow[]
  loading: boolean
  error: string | null
}

export function useSalesByName(): UseSalesByNameResult {
  const [data, setData] = useState<SalesByNameRow[]>([])
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
        .abortSignal(controller.signal)

      if (controller.signal.aborted || cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setData(rows ?? [])
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
