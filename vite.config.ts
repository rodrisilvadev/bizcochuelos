import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Pre-bundlear lucide-react evita el loop de "re-optimizar deps → recargar"
  // en dev cuando se agregan íconos nuevos.
  optimizeDeps: {
    include: ['lucide-react'],
  },
  server: {
    // El estado local (state.json que escribe server.js) no debe disparar HMR.
    watch: {
      ignored: ['**/state.json'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

