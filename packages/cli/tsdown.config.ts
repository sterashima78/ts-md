import tsMd from '@sterashima78/ts-md-unplugin/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts.md' },
  target: 'node18',
  format: ['esm'],
  shims: false,
  clean: true,
  dts: false,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      'commander',
      'fast-glob',
      'picocolors',
      '@volar/language-service',
      '@volar/kit',
      '@sterashima78/ts-md-ls-core',
      '@sterashima78/ts-md-core',
      '@sterashima78/ts-md-loader',
      'vscode-uri',
      'tsx/esm',
    ],
  },
  plugins: [tsMd],
  define: {
    'import.meta.vitest': 'undefined',
  },
});
