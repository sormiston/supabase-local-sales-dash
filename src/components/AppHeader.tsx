import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'

export function AppHeader() {
  const { session, loading } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <header className="border-border bg-surface border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <h1 className="text-ink-primary text-xl font-semibold">Supabase Local Sales Dash</h1>
        {!loading && session && (
          <div className="flex items-center gap-4">
            <span className="text-ink-secondary text-sm">{session.user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-ink-secondary hover:text-ink-primary text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
