import tsMd from '@sterashima78/ts-md-unplugin/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts.md' },
  target: 'node24',
  format: ['esm'],
  shims: false,
  clean: true,
  dts: false,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      '@sterashima78/ts-md-tsc',
      '@sterashima78/ts-md-core',
      '@sterashima78/ts-md-loader',
      'tsx/esm',
    ],
  },
  plugins: [tsMd],
  define: {
    'import.meta.vitest': 'undefined',
  },
});
