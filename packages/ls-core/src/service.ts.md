# Service

共通の language plugin を使って `.ts.md` diagnostics を収集します。

```ts main
import fs from 'node:fs';
import { parseVirtualModuleFileName } from '@sterashima78/ts-md-core';
import type { LanguagePlugin } from '@volar/language-core';
import {
  type Language,
  type SourceScript,
  createLanguage,
  createLanguageService,
} from '@volar/language-service';
import ts from 'typescript';
import { URI } from 'vscode-uri';
import { type TsMdVirtualFile, createTsMdPlugin } from './index.js';

export interface TsMdDiagnostic {
  message: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface TsMdDiagnosticsResult {
  [file: string]: TsMdDiagnostic[];
}

function getSourceDocument(id: URI | string): string | undefined {
  const raw = typeof id === 'string' ? id : id.fsPath;
  return parseVirtualModuleFileName(raw)?.documentPath ??
    (typeof id === 'string' ? undefined : id.fsPath);
}

export function createTsMdLanguageService(files: string[]) {
  const scripts = new Map<URI, SourceScript<URI>>();
  const plugin = createTsMdPlugin as unknown as LanguagePlugin<
    URI,
    TsMdVirtualFile
  >;
  let language!: Language<URI>;

  language = createLanguage<URI>([plugin], scripts, (id) => {
    const filePath = getSourceDocument(id);
    if (!filePath || !fs.existsSync(filePath)) return;
    const uri = URI.file(filePath);
    if (scripts.has(uri)) return;
    const snapshot = ts.ScriptSnapshot.fromString(
      fs.readFileSync(filePath, 'utf8'),
    );
    language.scripts.set(uri, snapshot, 'ts-md');
  });

  for (const file of files) {
    const uri = URI.file(file);
    const snapshot = ts.ScriptSnapshot.fromString(fs.readFileSync(file, 'utf8'));
    language.scripts.set(uri, snapshot, 'ts-md');
  }

  const ls = createLanguageService(language, [], { workspaceFolders: [] }, {});
  return { language, ls };
}

export async function collectDiagnostics(
  files: string[],
): Promise<TsMdDiagnosticsResult> {
  const { language, ls } = createTsMdLanguageService(files);
  const result: TsMdDiagnosticsResult = {};

  for (const file of files) {
    const uri = URI.file(file);
    language.scripts.get(uri);
    result[file] = (await ls.getDiagnostics(uri)) as TsMdDiagnostic[];
  }

  return result;
}
```
