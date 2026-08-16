import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      // Test files share live state in one local Postgres instance (e.g. the
      // shared integration-test auth account), so they must run sequentially.
      fileParallelism: false,
    },
  }),
)
