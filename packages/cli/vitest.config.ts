import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [tsMd],
  define: {
    'import.meta.vitest': 'true',
  },
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '/src/': `${import.meta.dirname}/src/`,
    },
  },
});
