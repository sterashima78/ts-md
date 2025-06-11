import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/vite.ts',
    'src/rollup.ts',
    'src/webpack.ts',
    'src/esbuild.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
});
