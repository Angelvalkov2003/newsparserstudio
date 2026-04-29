import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      /** Twelve Punto API when VITE_TWELVE_PUNTO_API_ORIGIN is unset (same-origin /twelve-punto-api). */
      '/twelve-punto-api': {
        target: 'http://ai.12punto.com.tr:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/twelve-punto-api/, '') || '/',
      },
    },
  },
})
