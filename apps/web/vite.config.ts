import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'share': resolve(__dirname, '../../packages/share/src/index.ts'),
    },
  },
  server: {
    port: 3001,
    host: true,
  },
  build: {
    outDir: '../../dist/apps/web',
  },
});