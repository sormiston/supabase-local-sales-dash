import { useActionState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface FormState {
  error: string | null
  success: boolean
}

const initialState: FormState = { error: null, success: false }

export function InviteTeamMembers() {
  async function invite(_prevState: FormState, formData: FormData): Promise<FormState> {
    const email = formData.get('email')
    const fullName = formData.get('fullName')
    const role = formData.get('role')

    if (typeof email !== 'string' || email === '') {
      return { error: 'Enter an email address.', success: false }
    }

    if (typeof fullName !== 'string' || fullName === '') {
      return { error: 'Enter a full name.', success: false }
    }

    if (role !== 'rep' && role !== 'team_lead') {
      return { error: 'Select a role.', success: false }
    }

    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email, fullName, role },
    })

    if (error) {
      return { error: error.message, success: false }
    }

    return { error: null, success: true }
  }

  const [state, formAction, isPending] = useActionState(invite, initialState)

  return (
    <div className="bg-page flex min-h-screen items-center justify-center">
      <form
        action={formAction}
        className="border-border bg-surface flex w-full max-w-sm flex-col gap-4 rounded-lg border p-4"
      >
        <h1 className="text-ink-primary text-lg font-medium">Invite team member</h1>

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
          <label htmlFor="fullName" className="text-ink-secondary text-sm">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-ink-secondary text-sm">
            Role
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="rep"
            className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
          >
            <option value="rep">Rep</option>
            <option value="team_lead">Team Lead</option>
          </select>
        </div>

        {state.error && <p className="text-sm text-red-600">Couldn't send invite: {state.error}</p>}
        {state.success && <p className="text-sm text-green-600">Invite sent.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="bg-series-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send invite'}
        </button>
      </form>
    </div>
  )
}
