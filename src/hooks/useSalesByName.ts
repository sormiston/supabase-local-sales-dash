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
    const controller = new AbortController()

    async function fetchSalesByName() {
      setLoading(true)
      setError(null)

      const { data: rows, error: fetchError } = await supabase
        .from('sales_by_name')
        .select('*')
        .order('total_value', { ascending: false })
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setData(rows ?? [])
      }
      setLoading(false)
    }

    fetchSalesByName()

    return () => {
      controller.abort()
    }
  }, [])

  return { data, loading, error }
}
