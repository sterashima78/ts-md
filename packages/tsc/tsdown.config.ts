import { defineConfig } from 'tsdown';
import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin.ts';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  dts: false,
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: ['@sterashima78/ts-md-ls-core', 'typescript'],
  },
  plugins: [tsMdBootstrapPlugin()],
});
