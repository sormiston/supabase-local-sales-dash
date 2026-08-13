import { AppHeader } from '@/components/AppHeader'
import { SalesByNameChart } from '@/components/SalesByNameChart'

function App() {
  return (
    <div className="bg-page min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="text-ink-primary mb-4 text-lg font-medium">Sales by name</h2>
        <SalesByNameChart />
      </main>
    </div>
  )
}

export default App
