import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    threads: false,
    environment: 'node',
    testTimeout: 60_000,
  },
});
