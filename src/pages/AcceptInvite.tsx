import { useActionState, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type Status = 'verifying' | 'ready' | 'invalid'

interface FormState {
  error: string | null
}

const initialState: FormState = { error: null }

export function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('verifying')
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (verifiedRef.current) return
    verifiedRef.current = true

    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (!tokenHash || type !== 'invite') {
      setStatus('invalid')
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType }).then(({ error }) => {
      setStatus(error ? 'invalid' : 'ready')
    })
  }, [searchParams])

  async function setPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (typeof password !== 'string' || password === '') {
      return { error: 'Enter a password.' }
    }

    if (password !== confirmPassword) {
      return { error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return { error: error.message }
    }

    navigate('/dashboard')
    return { error: null }
  }

  const [state, formAction, isPending] = useActionState(setPassword, initialState)

  if (status === 'verifying') {
    return (
      <div className="bg-page flex min-h-screen items-center justify-center">
        <p className="text-ink-secondary text-sm">Verifying your invite…</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="bg-page flex min-h-screen items-center justify-center">
        <div className="border-border bg-surface flex w-full max-w-sm flex-col gap-4 rounded-lg border p-4">
          <p className="text-sm text-red-600">
            This invite link is invalid or has expired. Ask your team lead to send a new one.
          </p>
          <Link to="/" className="text-series-1 text-sm hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-page flex min-h-screen items-center justify-center">
      <form
        action={formAction}
        className="border-border bg-surface flex w-full max-w-sm flex-col gap-4 rounded-lg border p-4"
      >
        <h1 className="text-ink-primary text-lg font-medium">Set your password</h1>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-ink-secondary text-sm">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-ink-secondary text-sm">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">Couldn't set password: {state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="bg-series-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Set password and continue'}
        </button>
      </form>
    </div>
  )
}
