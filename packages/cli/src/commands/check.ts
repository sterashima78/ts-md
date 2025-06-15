import {
  type TsMdVirtualFile,
  createTsMdPlugin,
} from '@sterashima78/ts-md-ls-core';
import { createTypeScriptInferredChecker } from '@volar/kit';
import type { Diagnostic, LanguagePlugin } from '@volar/language-service';
import pc from 'picocolors';
import type { URI } from 'vscode-uri';
import { expandGlobs } from '../utils/globs';

export async function runCheck(globs: string[] = []) {
  const files = await expandGlobs(globs);
  if (!files.length) return console.log(pc.yellow('No .ts.md files found.'));

  const checker = createTypeScriptInferredChecker(
    [createTsMdPlugin as unknown as LanguagePlugin<URI, TsMdVirtualFile>],
    [],
    () => files,
  );

  let errorCount = 0;
  for (const file of files) {
    const diags = (await checker.check(file)) as Diagnostic[];
    if (diags.length) {
      console.error(checker.printErrors(file, diags));
    }
    errorCount += diags.length;
  }

  if (errorCount) process.exit(1);
}
