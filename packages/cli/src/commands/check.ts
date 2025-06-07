import {
  type TsMdDiagnosticsResult,
  collectDiagnostics,
} from '@sterashima78/ts-md-ls-core';
import pc from 'picocolors';
import { expandGlobs } from '../utils/globs';

export async function runCheck(globs: string[]) {
  const files = await expandGlobs(globs);
  if (!files.length) return console.log(pc.yellow('No .ts.md files found.'));

  const result: TsMdDiagnosticsResult = await collectDiagnostics(files);
  let errorCount = 0;

  for (const file of files) {
    const diags = result[file] ?? [];
    for (const d of diags) {
      console.error(
        `${pc.red('error')} ${file}:${d.range.start.line + 1}:${d.range.start.character + 1} ${d.message}`,
      );
    }
    errorCount += diags.length;
  }

  if (errorCount) process.exit(1);
}
