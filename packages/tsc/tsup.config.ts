import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  dts: false,
  clean: true,
  splitting: false,
  external: ['@volar/typescript', '@sterashima78/ts-md-ls-core', 'typescript'],
});
