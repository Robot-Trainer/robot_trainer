import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["serialport", "drizzle-orm"],
    },
  },
  define: {
    'import.meta.env.mode': JSON.stringify('production'),
  },
});
