import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Database } from '@/lib/database.types'

type SalesByNameRow = Database['public']['Views']['sales_by_name']['Row']

const numberFormatter = new Intl.NumberFormat('en-US')

interface ChartTooltipProps {
  active?: boolean
  payload?: { payload: SalesByNameRow }[]
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const row = payload[0].payload

  return (
    <div className="border-border bg-surface rounded-md border px-3 py-2 shadow-sm">
      <p className="text-ink-secondary text-sm">{row.name}</p>
      <p className="text-ink-primary text-base font-semibold">
        {numberFormatter.format(row.total_value ?? 0)}
      </p>
      <p className="text-ink-muted text-xs">
        {row.deal_count} {row.deal_count === 1 ? 'deal' : 'deals'}
      </p>
    </div>
  )
}

interface SalesByNameChartProps {
  data: SalesByNameRow[]
  loading: boolean
  error: string | null
}

export function SalesByNameChart({ data, loading, error }: SalesByNameChartProps) {
  console.log('data, loading, error: ', data, loading, error);
  // if (loading && data.length === 0) {
  //   return <p className="text-ink-secondary text-sm h-80 w-full">Loading sales data…</p>
  // }

  if (error) {
    return <p className="text-ink-secondary text-sm h-80 w-full">Couldn't load sales data: {error}</p>
  }

  if (!loading && data.length === 0) {
    return <p className="text-ink-secondary text-sm h-80 w-full">No sales data yet.</p>
  }

  return (
    <div className="border-border bg-surface h-80 w-full rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-gridline)" strokeDasharray="0" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-axis)' }}
            tick={{ fill: 'var(--color-ink-muted)', fontSize: 13 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-ink-muted)', fontSize: 12 }}
            tickFormatter={(value: number) => numberFormatter.format(value)}
            width={64}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'var(--color-ink-primary)', fillOpacity: 0.04 }}
          />
          <Bar
            dataKey="total_value"
            fill="var(--color-series-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          >
            <LabelList
              dataKey="total_value"
              position="top"
              formatter={(value: string | number | boolean | null | undefined) =>
                typeof value === 'number' ? numberFormatter.format(value) : value
              }
              fill="var(--color-ink-secondary)"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
