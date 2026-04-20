import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],

  // Replace console.* with no-ops in production bundles.
  // Vite 8 uses oxc/rolldown — esbuild drop option is not available.
  // define-based replacement is the supported Vite 8 approach.
  define: mode === 'production' ? {
    'console.log':   '(()=>{})',
    'console.warn':  '(()=>{})',
    'console.info':  '(()=>{})',
    'console.debug': '(()=>{})',
  } : {},

  build: {
    chunkSizeWarningLimit: 1000,
  },

  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
}))
