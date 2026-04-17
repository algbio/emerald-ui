import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "https://algbio.github.io/emerald-ui/",
  build: {
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('node_modules/molstar')) {
            return 'vendor-molstar';
          }

          if (id.includes('node_modules/@mui') || id.includes('node_modules/@emotion')) {
            return 'vendor-ui';
          }

          if (id.includes('node_modules/d3')) {
            return 'vendor-d3';
          }

          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/svg2pdf.js') ||
            id.includes('node_modules/canvas2svg') ||
            id.includes('node_modules/html2canvas')
          ) {
            return 'vendor-export';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
