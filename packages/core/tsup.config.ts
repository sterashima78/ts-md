import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: false,
  format: ['esm'],
  clean: true,
  target: 'node18',
  esbuildPlugins: [tsMd],
});
