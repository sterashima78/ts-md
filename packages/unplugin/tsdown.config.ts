import tsMd from 'ts-md-unplugin-build/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts.md',
    'src/vite.ts',
    'src/rollup.ts',
    'src/rolldown.ts',
    'src/webpack.ts',
    'src/esbuild.ts',
  ],
  format: ['esm'],
  dts: false,
  clean: true,
  plugins: [tsMd],
});
