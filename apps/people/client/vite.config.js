import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/people/',
  plugins: [react()],
  server: {
    proxy: {
      '/people/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/people/, ''),
      },
    },
  },
});
