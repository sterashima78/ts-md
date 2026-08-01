import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/extension.ts', 'src/server/server.ts'],
  format: ['cjs'],
  dts: true,
  target: 'node18',
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: ['vscode'],
  },
});
