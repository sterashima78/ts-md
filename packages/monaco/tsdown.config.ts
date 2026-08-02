import { defineConfig } from 'tsdown';
import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: false,
  format: ['esm'],
  target: 'es2020',
  clean: true,
  outExtensions: () => ({ js: '.js' }),
  plugins: [tsMdBootstrapPlugin()],
});
