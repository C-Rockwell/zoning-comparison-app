import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Store Vite cache outside Dropbox to avoid file-locking issues
  cacheDir: path.join(os.tmpdir(), 'vite-zoning-cache'),
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
