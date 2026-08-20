import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://brandmarketplace.runasp.net',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'ws://brandmarketplace.runasp.net',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
