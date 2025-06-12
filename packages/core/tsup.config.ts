import plugin from '@sterashima78/ts-md-unplugin/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm'],
  clean: true,
  target: 'node18',
  esbuildPlugins: [plugin],
});
