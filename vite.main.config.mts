import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs'
      },
      external: ['electron', 'serialport', 'usb', 'dynamixel']
    }
  },
  optimizeDeps: {
    exclude: ['electron', 'dynamixel']
  },
  esbuild: {
    target: 'esnext'
  }
});
