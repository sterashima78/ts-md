import tsMd from '@sterashima78/ts-md-unplugin/rollup';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    app: 'src/index.ts',
    importExample: 'src/import-example.ts',
    typeImportExample: 'src/type-import-example.ts',
  },
  format: ['esm'],
  target: 'node18',
  clean: true,
  outDir: 'dist/tsdown',
  plugins: [tsMd],
});
