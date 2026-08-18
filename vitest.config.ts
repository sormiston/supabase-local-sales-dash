import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Widened only for this vitest-only config (never applied to the app's own
    // vite.config.ts build), so tests/testAuth.ts's service-role client can read
    // SUPABASE_SECRET_KEY via import.meta.env without risking it becoming
    // statically replaceable in the shipped app bundle.
    envPrefix: ['VITE_', 'SUPABASE_'],
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      // Test files share live state in one local Postgres instance (seeded demo
      // users, sales_deals rows), so they must run sequentially.
      fileParallelism: false,
    },
  }),
)
