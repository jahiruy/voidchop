import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
