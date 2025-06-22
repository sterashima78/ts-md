import tsMd from 'ts-md-unplugin-build/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts.md',
    'src/vite.ts',
    'src/rollup.ts',
    'src/webpack.ts',
    'src/esbuild.ts',
  ],
  format: ['esm'],
  dts: false,
  clean: true,
  esbuildPlugins: [tsMd],
});
