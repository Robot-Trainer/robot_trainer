import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'copy-drizzle',
    writeBundle: async () => {
      const src = path.resolve(__dirname, 'drizzle');
      const dest = path.resolve(__dirname, '.vite/build/drizzle');
      if (fs.existsSync(src)) {
        await fs.promises.cp(src, dest, { recursive: true });
      }
    }
  }],
  build: {
    rollupOptions: {
      external: ["serialport", "drizzle-orm", "jsdom"],
    },
    watch: mode === 'development' ? {
      // Exclude the Python venv from file watching to avoid ENOSPC errors
      exclude: ['src/python/.venv/**'],
    } : null,
  },
  server: {
    watch: {
      ignored: ['**/src/python/.venv/**'],
    },
  },
  define: {
    'import.meta.env.mode': JSON.stringify('production'),
  },
}));
