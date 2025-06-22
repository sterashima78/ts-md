import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const r = (p: string) => resolve(dirname(fileURLToPath(import.meta.url)), p);

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [tsMd],
  test: {
    globals: true,
    include: [r('src/utils/globs.ts.md'), r('src/utils/spawn.ts.md')],
  },
});
