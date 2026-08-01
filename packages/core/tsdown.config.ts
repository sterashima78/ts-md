import tsMd from '@sterashima78/ts-md-unplugin/rolldown';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: false,
  format: ['esm'],
  clean: true,
  target: 'node18',
  plugins: [tsMd],
  define: {
    'import.meta.vitest': 'undefined',
  },
});
