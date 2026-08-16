import { useActionState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

interface FormState {
  error: string | null
}

const initialState: FormState = { error: null }

export function SignUp() {
  const navigate = useNavigate()

  async function signUp(_prevState: FormState, formData: FormData): Promise<FormState> {
    const email = formData.get('email')
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (typeof email !== 'string' || email === '') {
      return { error: 'Enter your email.' }
    }

    if (typeof password !== 'string' || password === '') {
      return { error: 'Enter your password.' }
    }

    if (password !== confirmPassword) {
      return { error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return { error: error.message }
    }

    navigate('/dashboard')
    return { error: null }
  }

  const [state, formAction, isPending] = useActionState(signUp, initialState)

  return (
    <div className="bg-page flex min-h-screen items-center justify-center">
      <form
        action={formAction}
        className="border-border bg-surface flex w-full max-w-sm flex-col gap-4 rounded-lg border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-ink-secondary text-sm">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          />
        </div>

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

        {state.error && <p className="text-sm text-red-600">Couldn't sign up: {state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="bg-series-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Signing up…' : 'Sign up'}
        </button>

        <p className="text-ink-secondary text-center text-sm">
          Already have an account?{' '}
          <Link to="/" className="text-series-1 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
