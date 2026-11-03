import { defineConfig } from 'vite';

export default defineConfig({
  base: '/voidchop/',
  root: '.',
  publicDir: 'public',
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
