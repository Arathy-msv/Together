import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { prefixPublicAssets } from './scripts/prefix-public-assets.ts'

const base = process.env.PAGES_BASE || '/'

export default defineConfig({
  base,
  plugins: [react(), prefixPublicAssets()],
  server: {
    port: 4321,
    host: '0.0.0.0',
    strictPort: true,
  },
})
