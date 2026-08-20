import { AddSalesDealForm } from '@/components/AddSalesDealForm'
import { SalesByNameChart } from '@/components/SalesByNameChart'
import { useSalesByName } from '@/hooks/useSalesByName'

export function Dashboard() {
  const { data, loading, error } = useSalesByName()

  if (error) {
    return (
      <div className="bg-page min-h-screen">
        <main className="mx-auto max-w-5xl px-6 py-8">
          <h2 className="text-ink-primary mb-4 text-lg font-medium">Sales by name</h2>
          <p className="text-ink-secondary text-sm">Error loading sales data: {error}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-page min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="text-ink-primary mb-4 text-lg font-medium">Sales by name</h2>
        <SalesByNameChart data={data} loading={loading} error={error} />

        <h2 className="text-ink-primary mt-8 mb-4 text-lg font-medium">Add a deal</h2>
        <AddSalesDealForm />
      </main>
    </div>
  )
}
