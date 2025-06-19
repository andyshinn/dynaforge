import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'cjs'
      },
      external: ['electron']
    }
  },
  optimizeDeps: {
    exclude: ['electron']
  },
  esbuild: {
    target: 'esnext'
  }
});
