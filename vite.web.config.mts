/**
 * Vite configuration for the web (non-Electron) build.
 *
 * Produces a static SPA in dist/web/ that is served by src/server/index.ts.
 * The entry point is index.web.html → src/renderer.web.ts, which injects
 * window.electronAPI via src/web-preload.ts before React mounts.
 *
 * VITE_APP_MODE is set to "web" so that any code that needs to branch on the
 * runtime environment can do so with:
 *   import.meta.env.VITE_APP_MODE === 'web'
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.web.html',
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      ignored: ['**/src/python/.venv/**'],
    },
  },
  define: {
    // Allows renderer code to detect which mode it is running in.
    'import.meta.env.VITE_APP_MODE': JSON.stringify('web'),
  },
});
