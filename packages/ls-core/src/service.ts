import fs from 'node:fs';
import { parseChunks } from '@sterashima78/ts-md-core';
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

export function createTsMdLanguageService(files: string[]) {
  const scripts = new Map<URI, SourceScript<URI>>();
  const plugin = createTsMdPlugin as unknown as LanguagePlugin<
    URI,
    TsMdVirtualFile
  >;
  let language!: Language<URI>;
  language = createLanguage<URI>([plugin], scripts, (id) => {
    if (scripts.has(id)) return;
    let filePath: string;
    if (typeof id === 'string') {
      const m = /^#(.+):/.exec(id);
      if (!m) return;
      filePath = URI.parse(m[1]).fsPath;
    } else {
      filePath = id.fsPath;
    }
    const snapshot = ts.ScriptSnapshot.fromString(
      fs.readFileSync(filePath, 'utf8') as unknown as string,
    );
    language.scripts.set(
      typeof id === 'string' ? URI.parse(id) : id,
      snapshot,
      'ts-md',
    );
  });

  for (const file of files) {
    const uri = URI.file(file);
    const snapshot = ts.ScriptSnapshot.fromString(
      fs.readFileSync(file, 'utf8') as unknown as string,
    );
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
    let diags = await ls.getDiagnostics(uri);
    if (!diags.length) {
      diags = [];
      const md = fs.readFileSync(file, 'utf8');
      const dict = parseChunks(md, file);
      for (const [chunk, code] of Object.entries(dict)) {
        const name = `${file}:${chunk}.ts`;
        const options = {
          noEmit: true,
          module: ts.ModuleKind.CommonJS,
        } as ts.CompilerOptions;
        const host = ts.createCompilerHost(options);
        host.getSourceFile = (f, l) =>
          f === name
            ? ts.createSourceFile(f, code, l)
            : ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), l);
        host.readFile = (f) => (f === name ? code : fs.readFileSync(f, 'utf8'));
        host.fileExists = (f) => f === name || fs.existsSync(f);
        const program = ts.createProgram([name], options, host);
        const extra = ts.getPreEmitDiagnostics(program).map((d) => {
          const sf = program.getSourceFile(name);
          return {
            message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
            range: {
              start: sf?.getLineAndCharacterOfPosition(d.start ?? 0) ?? {
                line: 0,
                character: 0,
              },
              end: sf?.getLineAndCharacterOfPosition(
                (d.start ?? 0) + (d.length ?? 0),
              ) ?? {
                line: 0,
                character: 0,
              },
            },
          } as TsMdDiagnostic;
        });
        diags.push(...extra);
      }
    }
    result[file] = diags as TsMdDiagnostic[];
  }

  return result;
}
