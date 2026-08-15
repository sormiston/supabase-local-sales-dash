import { AddSalesDealForm } from '@/components/AddSalesDealForm'
import { AppHeader } from '@/components/AppHeader'
import { SalesByNameChart } from '@/components/SalesByNameChart'
import { useSalesByName } from '@/hooks/useSalesByName'

function App() {
  const { data, loading, error } = useSalesByName()

  return (
    <div className="bg-page min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="text-ink-primary mb-4 text-lg font-medium">Sales by name</h2>
        <SalesByNameChart data={data} loading={loading} error={error} />

        <h2 className="text-ink-primary mt-8 mb-4 text-lg font-medium">Add a deal</h2>
        <AddSalesDealForm data={data} />
      </main>
    </div>
  )
}

export default App
