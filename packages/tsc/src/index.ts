#!/usr/bin/env node
import { createRequire } from 'node:module';
import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';

const require = createRequire(import.meta.url);

runTsc(
  require.resolve('typescript/lib/tsc'),
  {
    extraSupportedExtensions: ['.md'],
    extraExtensionsToRemove: ['.md'],
  },
  () => ({
    languagePlugins: [createTsMdPlugin],
  }),
);
