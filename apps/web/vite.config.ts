import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keeps Vite rooted in the web app when commands are executed from the monorepo root.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['pixelfish.app', 'www.pixelfish.app'],
  },
});