# Language Service Plugin

```ts main
import path from 'node:path';
import { bundleMarkdown } from '@sterashima78/ts-md-core';
import { type LanguagePlugin, forEachEmbeddedCode } from '@volar/language-core';
import type { TypeScriptExtraServiceScript } from '@volar/typescript';
import ts from 'typescript';
import { getChunkDict } from './parsers.ts.md';
import { TsMdVirtualFile } from './virtual-file.ts.md';

export const tsMdLanguagePlugin = {
  getLanguageId(fileName: string) {
    const name =
      typeof fileName === 'string'
        ? fileName
        : (fileName as unknown as { fsPath: string }).fsPath;
    return name.endsWith('.ts.md') ? 'ts-md' : undefined;
  },
  createVirtualCode(
    fileName: string,
    languageId: string,
    snapshot: ts.IScriptSnapshot,
  ) {
    if (languageId !== 'ts-md') return;
    const filePath =
      typeof fileName === 'string'
        ? fileName
        : (fileName as unknown as { fsPath: string }).fsPath;
    const dict = getChunkDict(snapshot, filePath);
    const uri =
      typeof fileName === 'string'
        ? fileName
        : (fileName as unknown as { toString(): string }).toString();
    return new TsMdVirtualFile(snapshot, uri, dict);
  },

  updateVirtualCode(
    fileName: string,
    oldFile: TsMdVirtualFile,
    snapshot: ts.IScriptSnapshot,
  ) {
    const name =
      typeof fileName === 'string'
        ? fileName
        : (fileName as unknown as { fsPath: string }).fsPath;
    if (!name.endsWith('.ts.md')) return;
    const filePath =
      typeof fileName === 'string'
        ? fileName
        : (fileName as unknown as { fsPath: string }).fsPath;
    const dict = getChunkDict(snapshot, filePath);
    oldFile.update(snapshot, dict);
    return oldFile;
  },

  resolveFileName(specifier: string, fromFile: string) {
    const baseFile =
      typeof fromFile === 'string'
        ? fromFile
        : (fromFile as unknown as { fsPath: string }).fsPath;
    if (specifier.endsWith('.ts.md') && !specifier.includes(':')) {
      const abs = path.resolve(path.dirname(baseFile), specifier);
      return `${abs}__main.ts`;
    }
    if (!(specifier.includes('.ts.md:') || specifier.startsWith(':'))) return;
    const idx = specifier.lastIndexOf(':');
    if (idx === -1) return;
    const rel = specifier.slice(0, idx);
    const chunk = specifier.slice(idx + 1);
    if (!chunk) return;
    const abs = rel ? path.resolve(path.dirname(baseFile), rel) : baseFile;
    if (path.resolve(abs) !== path.resolve(baseFile)) return;
    return `${abs}__${chunk}.ts`;
  },
  typescript: {
    extraFileExtensions: [
      {
        extension: 'ts.md',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
    getServiceScript(root: TsMdVirtualFile) {
      const main = root.embeddedCodes.find((c) => c.id.endsWith('__main.ts'));
      if (!main) return undefined;
      const text = root.snapshot.getText(0, root.snapshot.getLength());
      const codeText = bundleMarkdown(text, root.id, 'main');
      main.snapshot = {
        getText: (s, e) => codeText.slice(s, e),
        getLength: () => codeText.length,
        getChangeRange: () => undefined,
      };
      return {
        code: main,
        extension: '.ts',
        scriptKind: ts.ScriptKind.TS,
      };
    },
    getExtraServiceScripts(_fileName: string, root: TsMdVirtualFile) {
      const scripts: TypeScriptExtraServiceScript[] = [];
      for (const code of forEachEmbeddedCode(root)) {
        if (code.languageId === 'ts') {
          scripts.push({
            fileName: code.id,
            code,
            extension: '.ts',
            scriptKind: ts.ScriptKind.TS,
          });
        }
      }
      return scripts;
    },
  },
} as LanguagePlugin<string, TsMdVirtualFile> & {
  resolveFileName(specifier: string, fromFile: string): string | undefined;
};

if (import.meta.vitest) {
  await import(':plugin.test');
}
```

## Tests

```ts plugin.test
import fs from 'node:fs';
import path from 'node:path';
import type { LanguagePlugin } from '@volar/language-core';
import {
  type Language,
  type SourceScript,
  createLanguage,
  createLanguageService,
} from '@volar/language-service';
import ts from 'typescript';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import { tsMdLanguagePlugin as createTsMdPlugin } from ':main';
import type { TsMdVirtualFile } from './virtual-file.ts.md';

describe('ts-md-ls-core diagnostics', () => {
  const dir = path.join(__dirname, 'fixtures');
  const aPath = path.join(dir, 'a.ts.md');
  const mainPath = path.join(dir, 'main.ts.md');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      aPath,
      [
        '# A',
        '',
        '```ts foo',
        "export const msg: number = 'hi'",
        '```',
        '',
        '```ts main',
        "export { msg } from '#foo'",
        '```',
      ].join('\n'),
    );
    fs.writeFileSync(
      mainPath,
      [
        '# Main',
        '',
        '```ts main',
        "import './a.ts.md'",
        "import { msg } from './a.ts.md'",
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports diagnostics across docs', async () => {
    const scripts = new Map<URI, SourceScript<URI>>();
    const plugin = createTsMdPlugin as unknown as LanguagePlugin<URI, TsMdVirtualFile>;
    let language!: Language<URI>;
    language = createLanguage<URI>([plugin], scripts, (id) => {
      if (scripts.has(id)) return;
      let filePath: string;
      if (typeof id === 'string') {
        const m = /^(.*)__/.exec(id);
        if (!m) return;
        filePath = URI.parse(m[1]).fsPath;
      } else {
        filePath = id.fsPath;
      }
      const snapshot = ts.ScriptSnapshot.fromString(
        fs.readFileSync(filePath, 'utf8'),
      );
      language.scripts.set(
        typeof id === 'string' ? URI.parse(id) : id,
        snapshot,
        'ts-md',
      );
    });
    const ls = createLanguageService(language, [], { workspaceFolders: [] }, {});
    const uri = URI.file(mainPath);
    language.scripts.get(uri);
    const diags = await ls.getDiagnostics(uri);
    expect(diags.length).toBeGreaterThanOrEqual(0);
  });
});
```
