import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts', 'src/server/server.ts'],
  format: ['cjs'],
  splitting: false,
  dts: true,
  target: 'node18',
  clean: true,
  external: ['vscode'],
});
