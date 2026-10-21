/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_PORT = process.env.API_PORT ?? '8787';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
  preview: {
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Librerías estables en chunks propios: mejor caché entre despliegues.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(\.pnpm\/)?(react|react-dom|react-router|scheduler)[@/]/.test(id)) return 'react';
          if (/node_modules\/(\.pnpm\/)?(gsap|@gsap)[@/+]/.test(id)) return 'gsap';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'server/**/*.test.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
