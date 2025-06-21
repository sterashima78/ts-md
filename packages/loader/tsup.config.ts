import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts.md' },
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  outExtension: () => ({ js: '.js' }),
  bundle: false,
  esbuildPlugins: [tsMd],
});
