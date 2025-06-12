import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  esbuildPlugins: [tsMd],
});
