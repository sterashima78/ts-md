import tsMd from '@sterashima78/ts-md-unplugin/rolldown';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  deps: {
    neverBundle: ['typescript'],
  },
  plugins: [tsMd],
});
