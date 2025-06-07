import fs from 'node:fs';
import { createTsMdPlugin as tsMdLanguagePlugin } from '@sterashima78/ts-md-ls-core';
import { createLanguageService } from '@volar/language-service';
import pc from 'picocolors';
import ts from 'typescript';
import { expandGlobs } from '../utils/globs';

export async function runCheck(globs: string[]) {
  const files = await expandGlobs(globs);
  if (!files.length) return console.log(pc.yellow('No .ts.md files found.'));

  const docs = files.map((f) => ({
    fileName: f,
    languageId: 'ts-md',
    snapshot: ts.ScriptSnapshot.fromString(
      fs.readFileSync(f, 'utf8') as unknown as string,
    ),
  }));

  const ls = createLanguageService(docs, { plugins: [tsMdLanguagePlugin], ts });

  let errorCount = 0;
  for (const file of files) {
    const diags = ls.doValidation(file);
    for (const d of diags) {
      console.error(
        `${pc.red('error')} ${file}:${d.range.start.line + 1}:${d.range.start.character + 1} ${d.message}`,
      );
    }
    errorCount += diags.length;
  }
  if (errorCount) process.exit(1);
}
