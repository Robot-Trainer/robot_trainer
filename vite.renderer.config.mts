import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Import the react plugin
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const plugins = [react(), tailwindcss()];
const pgliteAdminPath = fileURLToPath(new URL('../pglite-admin/src/index.js', import.meta.url));
if (existsSync(pgliteAdminPath)) {
  const { pgliteAdmin } = await import(pathToFileURL(pgliteAdminPath).href);
  plugins.push(pgliteAdmin());
}

// https://vitejs.dev/config
export default defineConfig({
  plugins,
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    watch: {
      ignored: ['**/src/python/.venv/**'],
    },
        open: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    }
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    }
  },
});
