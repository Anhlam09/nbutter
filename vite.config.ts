import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { securityHeadersPlugin } from './src/security/csp.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeadersPlugin()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: { chunkSizeWarningLimit: 700, sourcemap: false },
});
