import { Navigate, Route, Routes } from 'react-router-dom'
import { AcceptInvite } from '@/pages/AcceptInvite'
import { Dashboard } from '@/pages/Dashboard'
import { InviteTeamMembers } from '@/pages/InviteTeamMembers'
import { Login } from '@/pages/Login'
import { AppHeader } from '@/components/AppHeader'
import { RequireTeamLead } from '@/components/RequireTeamLead'
import { RequireAuth } from '@/components/RequireAuth'
import { RequireGuest } from '@/components/RequireGuest'

function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/" element={<Login />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route element={<RequireTeamLead />}>
            <Route path="/team-lead/invite" element={<InviteTeamMembers />} />
          </Route>
        </Route>
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
