import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron'
  
  return {
    plugins: [react()],
    base: isElectron ? './' : "https://algbio.github.io/emerald-ui/",
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
