import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.ts',
  },
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node22',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: ['@sterashima78/ts-md-core'],
  },
});
