import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'

export function RequireTeamLead() {
  const { session, loading } = useAuth()
  const [isTeamLead, setIsTeamLead] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) {
      setIsTeamLead(null)
      return
    }

    let cancelled = false

    supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setIsTeamLead(data?.role === 'team_lead')
      })

    return () => {
      cancelled = true
    }
  }, [session])

  if (loading) return null
  if (!session) return <Navigate to="/" replace />
  if (isTeamLead === null) return null
  if (!isTeamLead) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
