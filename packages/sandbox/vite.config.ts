import { resolve } from 'node:path';
import tsMd from '@sterashima78/ts-md-unplugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'app',
    },
    outDir: 'dist/vite',
    emptyOutDir: true,
  },
  plugins: [tsMd],
});
