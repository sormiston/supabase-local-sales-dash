import { useActionState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface FormState {
  error: string | null
}

const initialState: FormState = { error: null }

interface AddSalesDealFormProps {
  data: { name: string; repId: string }[]
  loading: boolean
}

export function AddSalesDealForm({ data, loading }: AddSalesDealFormProps) {
  const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name))

  async function addDeal(_prevState: FormState, formData: FormData): Promise<FormState> {
    const repId = formData.get('rep')
    const rawValue = formData.get('value')

    if (typeof repId !== 'string' || repId === '') {
      return { error: 'Select a sales rep.' }
    }

    const value = Number(rawValue)
    if (!Number.isInteger(value) || value <= 0) {
      return { error: 'Deal value must be a positive whole number.' }
    }

    const { error } = await supabase.from('sales_deals').insert({ rep_id: repId, value })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  }

  const [state, formAction, isPending] = useActionState(addDeal, initialState)

  if (!loading && data.length === 0) {
    return (
      <div className="border-border bg-surface rounded-lg border p-4">
        <p className="text-ink-secondary text-sm">
          No sales reps yet — add a deal from Supabase directly first, then this form can pick up
          their name.
        </p>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rep" className="text-ink-secondary text-sm">
          Sales rep
        </label>
        <select
          id="rep"
          name="rep"
          required
          defaultValue=""
          className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
        >
          <option value="" disabled>
            Select a rep…
          </option>
          {sortedData.map(({ name, repId }) => (
            <option key={repId} value={repId}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="deal-value" className="text-ink-secondary text-sm">
          Deal value
        </label>
        <input
          id="deal-value"
          name="value"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          placeholder="e.g. 5000"
          className="border-border bg-page text-ink-primary focus:border-series-1 rounded-md border px-3 py-2 text-sm focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">Couldn't add deal: {state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-series-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Adding…' : 'Add deal'}
      </button>
    </form>
  )
}
