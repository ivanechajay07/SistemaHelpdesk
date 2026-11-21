import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // sockjs-client (y otras dependencias del navegador) usan `global`.
  // Se resuelve en tiempo de build para no necesitar un script inline,
  // que la Content-Security-Policy (script-src 'self') bloquearía.
  define: {
    global: 'globalThis',
  },
  server: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
})
