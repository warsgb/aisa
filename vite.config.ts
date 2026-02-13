import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  base: './',
  server: {
    host: true, // Listen on all interfaces (0.0.0.0)
    port: 5173,
    strictPort: false,
    hmr: {
      protocol: 'ws', // Use WebSocket for HMR
    },
  },

  clearScreen: true,

  optimizeDeps: {
    include: [
      'vite',
      'react',
      'react-dom',
      'react-dom/client',
      '@uiw/react-md-editor',
    ],
    exclude: [
      'node_modules/.vite',
      'node_modules/react',
    ],
  },

  // Proxy API requests to backend
  proxy: {
    '/api': {
      target: 'http://69.5.7.242:3001',
      changeOrigin: true,
      secure: false,
      ws: true, // Proxy WebSocket
    },
    '/ws': {
      target: 'ws://69.5.7.242:3001',
      ws: true,
    },
  },
})
