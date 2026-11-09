import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build runs from any folder or host.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
});
