import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsMd],
  test: {
    globals: true,
  },
});
