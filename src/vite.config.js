import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel serves at the root of the deployment domain, so the default
// base ('/') is correct. No special configuration needed.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
