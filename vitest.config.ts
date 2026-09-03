import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    },
  },
})
