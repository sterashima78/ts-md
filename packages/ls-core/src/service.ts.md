# Collecting diagnostics through Volar

この document は TS-MD の language plugin を、editor だけでなく programmatic な diagnostics 収集にも使うための service layer です。

重要なのは、別の簡易 compiler を作らないことです。editor と同じ virtual file、module resolution、source mapping を使って language service を構築し、CLI や test からも同じ診断結果を得ます。

処理は source document の特定、language environment の構築、file ごとの diagnostics 収集に分かれます。

## Result shape

Volar の diagnostics から、利用側が必要とする message と range だけを表す型を定義します。結果は入力 file path を key にした辞書として返します。

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

`getSourceDocument` は language service が追加で要求した virtual module ID を元の `.ts.md` file へ戻します。language の callback は、その document がまだ登録されていない場合だけ snapshot を読み込みます。これにより、入力一覧に直接含まれない import 先 document も必要になった時点で参加できます。

`createTsMdLanguageService` は再利用可能な低水準 API として language と service を返します。`collectDiagnostics` はその上に file 単位の反復を置いた convenience API です。診断位置の Markdown への変換は plugin と virtual file mapping が担当するため、この層では独自の offset 計算を行いません。
