import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'src-electron/main.ts',
      formats: ['es'],
      fileName: 'main'
    },
    rollupOptions: {
      external: ['electron', 'path', 'url', 'fs', 'os']
    },
    outDir: 'dist-electron',
    emptyOutDir: true,
    sourcemap: true,
    target: 'node18'
  },
})