import { resolve } from 'node:path';
import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        app: resolve(__dirname, 'src/index.ts'),
        importExample: resolve(__dirname, 'src/import-example.ts'),
        typeImportExample: resolve(__dirname, 'src/type-import-example.ts'),
      },
      formats: ['es'],
    },
    outDir: 'dist/vite',
    emptyOutDir: true,
  },
  plugins: [tsMd],
});
