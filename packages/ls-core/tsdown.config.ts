import tsMd from '@sterashima78/ts-md-unplugin/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: ['typescript'],
  },
  plugins: [tsMd],
});
