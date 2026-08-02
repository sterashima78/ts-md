import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin.ts';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsMdBootstrapPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
