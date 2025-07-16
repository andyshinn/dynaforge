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
      external: ['electron', 'serialport', 'usb', 'dynamixel', 'werift']
    }
  },
  optimizeDeps: {
    exclude: ['electron', 'dynamixel', 'werift']
  },
  esbuild: {
    target: 'esnext'
  }
});
