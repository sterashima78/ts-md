import { createRequire } from 'node:module';
import {
  type TsMdVirtualFile,
  createTsMdPlugin,
} from '@sterashima78/ts-md-ls-core';
import type { LanguagePlugin } from '@volar/language-core';
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import pc from 'picocolors';
import { expandGlobs } from '../utils/globs';

export async function runCheck(globs: string[]) {
  const files = await expandGlobs(globs.filter((g) => !g.startsWith('-')));
  if (!files.length) return console.log(pc.yellow('No .ts.md files found.'));

  const require = createRequire(import.meta.url);

  // tsc \u306b\u6b21\u306e\u30d5\u30a1\u30a4\u30eb\u3092\u6e21\u3059
  const idx = process.argv.indexOf('check');
  const rest =
    idx >= 0
      ? process.argv.slice(idx + 1).filter((a) => a.startsWith('-'))
      : [];
  process.argv =
    idx >= 0
      ? [...process.argv.slice(0, idx), ...files, ...rest]
      : [process.argv[0], process.argv[1], ...files];

  runTsc(require.resolve('typescript/lib/tsc'), ['.ts.md'], () => ({
    languagePlugins: [
      createTsMdPlugin as unknown as LanguagePlugin<string, TsMdVirtualFile>,
    ],
  }));
}
