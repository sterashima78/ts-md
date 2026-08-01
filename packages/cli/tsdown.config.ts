import tsMd from '@sterashima78/ts-md-unplugin/rolldown';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts.md'],
  target: 'node18',
  format: ['esm'],
  shims: false,
  clean: true,
  dts: false,
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
});
