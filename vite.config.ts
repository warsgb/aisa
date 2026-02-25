import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  base: './',

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // UI libraries
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/@uiw/react-md-editor')) {
            return 'vendor-ui';
          }
          // LTC related
          if (id.includes('/src/components/ltc/') || id.includes('/src/pages/ltc-config/')) {
            return 'ltc';
          }
          // Skills related
          if (id.includes('/src/components/skill/') || id.includes('/src/pages/skills/')) {
            return 'skill';
          }
        }
      }
    }
  },

  server: {
    host: true, // Listen on all interfaces (0.0.0.0)
    port: 5173,
    strictPort: false,
    hmr: {
      protocol: 'ws', // Use WebSocket for HMR
    },
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // Proxy WebSocket
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: process.env.VITE_WS_URL ? process.env.VITE_WS_URL.replace('http://', 'ws://').replace('https://', 'wss://') : 'ws://localhost:3001',
        ws: true,
      },
    },
  },

  clearScreen: true,

  preview: {
    host: true,
    port: 5180,
    allowedHosts: ['winai.top', 'www.winai.top', '69.5.7.242'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@uiw/react-md-editor',
    ],
    // Exclude native modules from optimization
    exclude: ['fsevents'],
  },
})
