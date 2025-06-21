import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/runTest.ts', 'test/tsc.test.ts'],
    threads: false,
    environment: 'node',
    testTimeout: 60_000,
  },
});
