import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm'],
  splitting: false,
  target: 'es2020',
  clean: true,
});
