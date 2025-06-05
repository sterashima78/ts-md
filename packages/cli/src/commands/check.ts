import fs from 'node:fs';
import {
  type TsMdVirtualFile,
  tsMdLanguagePlugin,
} from '@sterashima78/ts-md-ls-core';
import {
  type Language,
  type LanguagePlugin,
  type SourceScript,
  createLanguage,
  createLanguageService,
} from '@volar/language-service';
import pc from 'picocolors';
import ts from 'typescript';
import { URI } from 'vscode-uri';
import { expandGlobs } from '../utils/globs';

export async function runCheck(globs: string[]) {
  const files = await expandGlobs(globs);
  if (!files.length) {
    console.log(pc.yellow('No .ts.md files found.'));
    return;
  }

  const scripts = new Map<URI, SourceScript<URI>>();
  let language!: Language<URI>;
  language = createLanguage<URI>(
    [tsMdLanguagePlugin as unknown as LanguagePlugin<URI, TsMdVirtualFile>],
    scripts,
    (uri) => {
      if (scripts.has(uri)) return;
      const filePath = uri.fsPath;
      const snapshot = ts.ScriptSnapshot.fromString(
        fs.readFileSync(filePath, 'utf8'),
      );
      language.scripts.set(uri, snapshot, 'ts-md');
    },
  );
  const ls = createLanguageService(language, [], { workspaceFolders: [] }, {});

  let errorCount = 0;
  for (const file of files) {
    const uri = URI.file(file);
    language.scripts.get(uri);
    const diags = await ls.getDiagnostics(uri);
    for (const d of diags) {
      console.error(
        `${pc.red('error')} ${file}:${d.range.start.line + 1}:${d.range.start.character + 1} ${d.message}`,
      );
    }
    errorCount += diags.length;
  }
  if (errorCount) process.exit(1);
}
