import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function RequireTeamLead() {
  const { session, profile, loading } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/" replace />
  if (profile === null) return null
  if (profile.role !== 'team_lead') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
