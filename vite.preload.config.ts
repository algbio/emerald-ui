import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'src-electron/preload.ts',
      formats: ['es'],
      fileName: 'preload'
    },
    rollupOptions: {
      external: ['electron']
    },
    outDir: 'dist-electron',
    emptyOutDir: false,
    sourcemap: true,
    target: 'node18'
  },
})