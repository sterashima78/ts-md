# Language Service Plugin

```ts main
import path from 'node:path';
import { bundleMarkdown } from '@sterashima78/ts-md-core';
import { type LanguagePlugin, forEachEmbeddedCode } from '@volar/language-core';
import type { TypeScriptExtraServiceScript } from '@volar/typescript';
import ts from 'typescript';
import { getChunkDict } from './parsers.ts.md';
import { TsMdVirtualFile } from './virtual-file.ts.md';

function getFileName(fileName: unknown): string {
  if (
    typeof fileName === 'object' &&
    fileName !== null &&
    'fsPath' in fileName &&
    typeof fileName.fsPath === 'string'
  ) {
    return fileName.fsPath;
  }
  return String(fileName);
}

function getUri(fileName: unknown): string {
  return typeof fileName === 'string' ? fileName : String(fileName);
}

function getChunkName(codeId: string): string | undefined {
  const marker = codeId.lastIndexOf('__');
  if (marker < 0 || !codeId.endsWith('.ts')) return;
  return codeId.slice(marker + 2, -3);
}

export function resolveTsMdFileName(
  specifier: string,
  fromFile: unknown,
): string | undefined {
  const baseFile = getFileName(fromFile).replace(/__[^/\\]+\.ts$/, '');
  let target = specifier;
  let chunk = 'main';

  if (specifier.startsWith(':') || specifier.startsWith('#')) {
    target = baseFile;
    chunk = specifier.slice(1);
  } else {
    const idx = specifier.lastIndexOf(':');
    if (idx > 1) {
      target = specifier.slice(0, idx);
      chunk = specifier.slice(idx + 1);
    }
    target = path.resolve(path.dirname(baseFile), target);
  }

  if (!chunk) return;
  const abs = path.isAbsolute(target)
    ? target
    : path.resolve(path.dirname(baseFile), target);
  if (!abs.endsWith('.ts.md')) return;
  return chunk === 'main' ? abs : `${abs}__${chunk}.ts`;
}

type TsMdPlugin = LanguagePlugin<unknown, TsMdVirtualFile> & {
  resolveFileName(specifier: string, fromFile: unknown): string | undefined;
};

function createPlugin(bundleServiceScript: boolean): TsMdPlugin {
  const typescript = {
    extraFileExtensions: [
      {
        extension: 'ts.md',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],

    getServiceScript(root: TsMdVirtualFile) {
      const main = root.embeddedCodes.find((code) =>
        code.id.endsWith('__main.ts'),
      );
      if (!main) return;

      if (bundleServiceScript) {
        const text = root.snapshot.getText(0, root.snapshot.getLength());
        const codeText = bundleMarkdown(text, root.id, 'main');
        main.snapshot = {
          getText: (start, end) => codeText.slice(start, end),
          getLength: () => codeText.length,
          getChangeRange: () => undefined,
        };
      }

      return {
        code: main,
        extension: '.ts' as const,
        scriptKind: ts.ScriptKind.TS,
      };
    },

    ...(bundleServiceScript
      ? {}
      : {
          getExtraServiceScripts(fileName: string, root: TsMdVirtualFile) {
            const scripts: TypeScriptExtraServiceScript[] = [];
            for (const code of forEachEmbeddedCode(root)) {
              if (
                code.languageId !== 'typescript' ||
                code.id.endsWith('__main.ts')
              ) {
                continue;
              }
              const chunkName = getChunkName(code.id);
              if (!chunkName) continue;
              scripts.push({
                fileName: `${fileName}__${chunkName}.ts`,
                code,
                extension: '.ts',
                scriptKind: ts.ScriptKind.TS,
              });
            }
            return scripts;
          },
        }),
  };

  return {
    getLanguageId(fileName: unknown) {
      return getFileName(fileName).endsWith('.ts.md') ? 'ts-md' : undefined;
    },

    createVirtualCode(
      fileName: unknown,
      languageId: string,
      snapshot: ts.IScriptSnapshot,
    ) {
      if (languageId !== 'ts-md') return;
      const filePath = getFileName(fileName);
      const dict = getChunkDict(snapshot, filePath);
      return new TsMdVirtualFile(snapshot, getUri(fileName), dict);
    },

    updateVirtualCode(
      fileName: unknown,
      oldFile: TsMdVirtualFile,
      snapshot: ts.IScriptSnapshot,
    ) {
      const filePath = getFileName(fileName);
      if (!filePath.endsWith('.ts.md')) return;
      const dict = getChunkDict(snapshot, filePath);
      oldFile.update(snapshot, dict);
      return oldFile;
    },

    resolveFileName: resolveTsMdFileName,
    typescript,
  } as TsMdPlugin;
}

export const tsMdLanguagePlugin = createPlugin(true);
export const tsMdEditorLanguagePlugin = createPlugin(false);

if (import.meta.vitest) {
  void import(':plugin.test');
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
import { describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import {
  resolveTsMdFileName,
  tsMdEditorLanguagePlugin,
  tsMdLanguagePlugin as createTsMdPlugin,
} from ':main';
import type { TsMdVirtualFile } from './virtual-file.ts.md';

describe('ts-md-ls-core diagnostics', () => {
  const dir = path.join(process.cwd(), 'test', 'fixtures');
  const mainPath = path.join(dir, 'main.ts.md');

  it('accepts URI objects', () => {
    expect(createTsMdPlugin.getLanguageId(URI.file('/x.ts.md'))).toBe('ts-md');
  });

  it('maps each code chunk to a TypeScript virtual document', () => {
    const markdown = ['```ts main', 'const value = { name: "ts-md" };', '```'].join(
      '\n',
    );
    const snapshot = ts.ScriptSnapshot.fromString(markdown);
    const virtualCode = tsMdEditorLanguagePlugin.createVirtualCode?.(
      URI.file('/test.ts.md'),
      'ts-md',
      snapshot,
      { getAssociatedScript: () => undefined },
    );
    const main = virtualCode?.embeddedCodes.find((code) =>
      code.id.endsWith('__main.ts'),
    );

    expect(main?.languageId).toBe('typescript');
    expect(main?.mappings).toEqual([
      expect.objectContaining({
        generatedOffsets: [0],
        lengths: ['const value = { name: "ts-md" };'.length],
      }),
    ]);
  });

  it('resolves shorthand chunk imports to virtual TypeScript files', () => {
    expect(resolveTsMdFileName(':foo', '/test.ts.md')).toBe(
      '/test.ts.md__foo.ts',
    );
    expect(resolveTsMdFileName('#foo', '/test.ts.md')).toBe(
      '/test.ts.md__foo.ts',
    );
  });

  it('creates language service', () => {
    const scripts = new Map<URI, SourceScript<URI>>();
    const plugin = createTsMdPlugin as unknown as LanguagePlugin<URI, TsMdVirtualFile>;
    let language!: Language<URI>;
    language = createLanguage<URI>([plugin], scripts, (id) => {
      if (scripts.has(id)) return;
      const filePath = id.fsPath;
      const snapshot = ts.ScriptSnapshot.fromString(
        fs.readFileSync(filePath, 'utf8'),
      );
      language.scripts.set(id, snapshot, 'ts-md');
    });
    const ls = createLanguageService(language, [], { workspaceFolders: [] }, {});
    const uri = URI.file(mainPath);
    language.scripts.get(uri);
    expect(ls).toBeDefined();
  });
});
```
