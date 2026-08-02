import { transformWithEsbuild } from 'vite';
import { defineConfig } from 'vitest/config';
import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin.ts';

export default defineConfig({
  plugins: [
    tsMdBootstrapPlugin(),
    {
      name: 'ts-md-test-transform',
      enforce: 'pre',
      transform(code, id) {
        const fileName = id.split('?', 1)[0];
        if (!fileName.endsWith('.ts.md')) return;
        return transformWithEsbuild(code, fileName, {
          loader: 'tsx',
          sourcemap: true,
        });
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
