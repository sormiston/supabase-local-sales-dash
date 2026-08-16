import { Route, Routes } from 'react-router-dom'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { AppHeader } from '@/components/AppHeader'
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
        </Route>
      </Routes>
    </>
  )
}

export default App
