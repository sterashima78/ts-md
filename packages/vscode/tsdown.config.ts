import { defineConfig } from 'tsdown';
import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin.ts';

export default defineConfig({
  entry: ['src/extension.ts', 'src/server/server.ts'],
  format: ['cjs'],
  dts: false,
  target: 'node18',
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: ['vscode'],
  },
  plugins: [tsMdBootstrapPlugin()],
});
