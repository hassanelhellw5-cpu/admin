import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5032',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'ws://localhost:5032',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
