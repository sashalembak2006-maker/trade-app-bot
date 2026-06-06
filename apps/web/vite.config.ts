import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,
    port: 5173,
    // Use 127.0.0.1 (IPv4) explicitly — resolving "localhost" can fall back
    // through IPv6 (::1) with a multi-second delay on Windows/Node, which made
    // proxied API calls appear to hang. 127.0.0.1 is instant.
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:3001', ws: true },
    },
  },
});
