import tsMd from '@sterashima78/ts-md-unplugin/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts.md' },
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  deps: {
    neverBundle: ['typescript'],
  },
  plugins: [tsMd],
});
