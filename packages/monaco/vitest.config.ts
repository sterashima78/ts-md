import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { transformWithEsbuild } from 'vite';
import { defineConfig } from 'vitest/config';
import { tsMdBootstrapPlugin } from '../../scripts/ts-md-bootstrap-plugin.ts';

const optimizedBrowserDependencies = [
  '@monaco-editor/react',
  '@testing-library/react',
  '@volar/language-core',
  '@volar/language-service',
  '@volar/monaco/lib/editor.js',
  '@volar/monaco/lib/languages.js',
  'monaco-editor',
  'monaco-editor/editor/editor.worker',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'ts-morph',
  'typescript',
  'volar-service-typescript',
  'vscode-uri',
];

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: optimizedBrowserDependencies,
    exclude: ['@volar/monaco/worker'],
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  plugins: [
    tsMdBootstrapPlugin(),
    {
      name: 'ts-md-test-transform',
      enforce: 'pre',
      transform(code, id) {
        const fileName = id.split('?', 1)[0];
        if (!fileName.endsWith('.ts.md')) return;
        return transformWithEsbuild(code, fileName, {
          loader: 'tsx',
          sourcemap: true,
        });
      },
    },
    react(),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
          exclude: ['test/**/*.browser.test.ts', 'test/**/*.browser.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          globals: true,
          include: ['test/**/*.browser.test.ts', 'test/**/*.browser.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
