import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  dts: false,
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: ['@sterashima78/ts-md-ls-core', 'typescript'],
  },
});
