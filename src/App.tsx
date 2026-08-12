import { AppHeader } from '@/components/AppHeader'
import { SalesByNameChart } from '@/components/SalesByNameChart'

function App() {
  return (
    <div className="min-h-screen bg-page">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="mb-4 text-lg font-medium text-ink-primary">
          Sales by name
        </h2>
        <SalesByNameChart />
      </main>
    </div>
  )
}

export default App
