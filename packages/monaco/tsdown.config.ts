import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm'],
  target: 'es2020',
  clean: true,
  outExtensions: () => ({ js: '.js' }),
});
