import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  outExtension: () => ({ js: '.js' }),
  bundle: false,
  esbuildPlugins: [tsMd],
});
