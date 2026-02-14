import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Import the react plugin
import tailwindcss from '@tailwindcss/vite'
import { pgliteAdmin } from '../pglite-admin/src/index.js';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pgliteAdmin()
  ],
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    watch: {
      ignored: ['**/src/python/.venv/**'],
    },
  },
});
