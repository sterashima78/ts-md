import { defineConfig } from 'vitest/config';
import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin.ts';

export default defineConfig({
  plugins: [tsMdBootstrapPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
