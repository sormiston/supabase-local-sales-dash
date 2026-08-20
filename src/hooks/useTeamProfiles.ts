import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type TeamProfilesData = { id: string; fullName: string }[]

export function useTeamProfiles() {
  const [profiles, setProfiles] = useState<TeamProfilesData>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProfiles() {
      setLoading(true)
      setError(null)

      const { data: rows, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .order('full_name')

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setProfiles(rows.map((row) => ({ id: row.id, fullName: row.full_name })))
      }
      setLoading(false)
    }

    fetchProfiles()

    return () => {
      cancelled = true
    }
  }, [])

  return { profiles, loading, error }
}
