import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [tsMd],
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    includeSource: [
      'src/commands/run.ts.md',
      'src/utils/globs.ts.md',
      'src/utils/spawn.ts.md',
    ],
  },
  resolve: {
    alias: {
      '/src/': `${import.meta.dirname}/src/`,
    },
  },
});
