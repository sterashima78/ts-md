import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  target: 'node18',
  format: ['esm'],
  platform: 'node',
  shims: false,
  splitting: false,
  clean: true,
  dts: false,
  external: [
    'commander',
    'fast-glob',
    'picocolors',
    '@volar/language-service',
    '@sterashima78/ts-md-ls-core',
    '@sterashima78/ts-md-core',
    '@sterashima78/ts-md-loader',
    'vscode-uri',
    'tsx/esm',
    'typescript',
  ],
});
