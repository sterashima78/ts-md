import tsMd from '@sterashima78/ts-md-unplugin/esbuild';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    app: 'src/index.ts',
    importExample: 'src/import-example.ts',
    typeImportExample: 'src/type-import-example.ts',
  },
  format: ['esm'],
  target: 'node18',
  clean: true,
  outDir: 'dist/tsup',
  esbuildPlugins: [tsMd],
});
