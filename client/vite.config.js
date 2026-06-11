import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // When using `vercel dev` at repo root, API is proxied automatically.
    // For client-only dev, proxy to Vercel dev (port 3000) or legacy Express (3001).
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
