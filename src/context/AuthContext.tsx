import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface Profile {
  role: 'rep' | 'team_lead'
  fullName: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setSession(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }

    let cancelled = false

    supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        setProfile({ role: data.role as Profile['role'], fullName: data.full_name })
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, profile, loading }),
    [session, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
