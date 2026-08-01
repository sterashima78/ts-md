import tsMd from 'ts-md-unplugin-build/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts.md',
    vite: 'src/vite.ts',
    rollup: 'src/rollup.ts',
    webpack: 'src/webpack.ts',
    esbuild: 'src/esbuild.ts',
  },
  format: ['esm'],
  dts: false,
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  plugins: [tsMd],
});
