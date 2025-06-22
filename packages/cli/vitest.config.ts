import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  plugins: [tsMd],
  test: {
    globals: true,
    include: ['src/utils/*.ts.md'],
  },
  resolve: {
    alias: {
      '/src/': `${__dirname}/src/`,
    },
  },
});
