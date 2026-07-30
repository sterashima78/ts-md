# Language Service Plugin

TypeScript の型検査とエディタ機能の両方で、各コードフェンスを同じ仮想 module として扱います。

```ts main
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
  resolveImport,
} from '@sterashima78/ts-md-core';
import type { LanguagePlugin, VirtualCode } from '@volar/language-core';
import { forEachEmbeddedCode } from '@volar/language-core';
import type { TypeScriptExtraServiceScript } from '@volar/typescript';
import ts from 'typescript';
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

function getModuleName(code: VirtualCode): string | undefined {
  return parseVirtualModuleFileName(code.id)?.moduleName;
}

function getScriptKind(root: TsMdVirtualFile, moduleName: string) {
  return root.getModule(moduleName)?.language === 'tsx'
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
}

function getExtension(root: TsMdVirtualFile, moduleName: string) {
  return root.getModule(moduleName)?.language === 'tsx'
    ? ('.tsx' as const)
    : ('.ts' as const);
}

function findModuleCode(root: TsMdVirtualFile, moduleName: string) {
  const id = createVirtualModuleFileName({
    documentPath: root.fileName,
    moduleName,
  });
  return root.embeddedCodes.find((code) => code.id === id);
}

function getPrimaryCode(root: TsMdVirtualFile) {
  return findModuleCode(root, 'main') ?? root.embeddedCodes[0];
}

export function resolveTsMdFileName(
  specifier: string,
  fromFile: unknown,
): string | undefined {
  const resolved = resolveImport(specifier, getFileName(fromFile));
  if (!resolved) return;
  if (resolved.chunk === 'main') return resolved.absPath;
  return createVirtualModuleFileName({
    documentPath: resolved.absPath,
    moduleName: resolved.chunk,
  });
}

type TsMdPlugin = LanguagePlugin<unknown, TsMdVirtualFile> & {
  resolveFileName(specifier: string, fromFile: unknown): string | undefined;
};

export const tsMdLanguagePlugin: TsMdPlugin = {
  getLanguageId(fileName: unknown) {
    return getFileName(fileName).endsWith('.ts.md') ? 'ts-md' : undefined;
  },

  createVirtualCode(
    fileName: unknown,
    languageId: string,
    snapshot: ts.IScriptSnapshot,
  ) {
    if (languageId !== 'ts-md') return;
    return new TsMdVirtualFile(snapshot, getFileName(fileName));
  },

  updateVirtualCode(
    fileName: unknown,
    oldFile: TsMdVirtualFile,
    snapshot: ts.IScriptSnapshot,
  ) {
    if (!getFileName(fileName).endsWith('.ts.md')) return;
    oldFile.update(snapshot);
    return oldFile;
  },

  resolveFileName: resolveTsMdFileName,

  typescript: {
    extraFileExtensions: [
      {
        extension: 'ts.md',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],

    getServiceScript(root: TsMdVirtualFile) {
      const code = getPrimaryCode(root);
      if (!code) return;
      const moduleName = getModuleName(code);
      if (!moduleName) return;
      return {
        code,
        extension: getExtension(root, moduleName),
        scriptKind: getScriptKind(root, moduleName),
      };
    },

    getExtraServiceScripts(
      _fileName: string,
      root: TsMdVirtualFile,
    ): TypeScriptExtraServiceScript[] {
      const primary = getPrimaryCode(root);
      const scripts: TypeScriptExtraServiceScript[] = [];
      for (const code of forEachEmbeddedCode(root)) {
        if (code.languageId !== 'typescript' || code === primary) continue;
        const moduleName = getModuleName(code);
        if (!moduleName) continue;
        scripts.push({
          fileName: code.id,
          code,
          extension: getExtension(root, moduleName),
          scriptKind: getScriptKind(root, moduleName),
        });
      }
      return scripts;
    },
  },
};

export const tsMdEditorLanguagePlugin = tsMdLanguagePlugin;

if (import.meta.vitest) {
  await import(':plugin.test');
}
```

## Tests

```ts plugin.test
import fs from 'node:fs';
import path from 'node:path';
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
} from '@sterashima78/ts-md-core';
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
  tsMdLanguagePlugin as createTsMdPlugin,
} from ':main';
import type { TsMdVirtualFile } from './virtual-file.ts.md';

const fence = (header: string, code: string) =>
  ['```' + header, code, '```'].join('\n');

describe('ts-md language plugin', () => {
  const dir = path.join(process.cwd(), 'test', 'fixtures');
  const mainPath = path.join(dir, 'main.ts.md');

  it('accepts URI objects', () => {
    expect(createTsMdPlugin.getLanguageId(URI.file('/x.ts.md'))).toBe('ts-md');
  });

  it('maps each code fence to one TypeScript virtual module', () => {
    const code = 'const value = { name: "ts-md" };';
    const markdown = fence('ts main', code);
    const snapshot = ts.ScriptSnapshot.fromString(markdown);
    const virtualFile = createTsMdPlugin.createVirtualCode?.(
      URI.file('/test.ts.md'),
      'ts-md',
      snapshot,
      { getAssociatedScript: () => undefined },
    );
    const main = virtualFile?.embeddedCodes[0];

    expect(main?.id).toBe(
      createVirtualModuleFileName({
        documentPath: '/test.ts.md',
        moduleName: 'main',
      }),
    );
    expect(main?.mappings).toEqual([
      expect.objectContaining({
        sourceOffsets: [markdown.indexOf(code)],
        generatedOffsets: [0],
        lengths: [code.length],
      }),
    ]);
  });

  it('preserves module names without delimiter parsing', () => {
    const markdown = [
      fence('ts foo__bar', 'export const value = 1;'),
      fence('ts main', "import { value } from ':foo__bar';"),
    ].join('\n\n');
    const snapshot = ts.ScriptSnapshot.fromString(markdown);
    const virtualFile = createTsMdPlugin.createVirtualCode?.(
      '/test.ts.md',
      'ts-md',
      snapshot,
      { getAssociatedScript: () => undefined },
    );
    const scripts = createTsMdPlugin.typescript?.getExtraServiceScripts?.(
      '/test.ts.md',
      virtualFile as TsMdVirtualFile,
    );

    expect(
      scripts?.map((script) =>
        parseVirtualModuleFileName(script.fileName)?.moduleName,
      ),
    ).toContain('foo__bar');
  });

  it('resolves the supported module specifiers', () => {
    expect(resolveTsMdFileName(':foo', '/test.ts.md')).toBe(
      createVirtualModuleFileName({
        documentPath: '/test.ts.md',
        moduleName: 'foo',
      }),
    );
    expect(resolveTsMdFileName('./dep.ts.md', '/test.ts.md')).toBe(
      path.resolve('/dep.ts.md'),
    );
    expect(resolveTsMdFileName('#foo', '/test.ts.md')).toBeUndefined();
  });

  it('creates language service', () => {
    const scripts = new Map<URI, SourceScript<URI>>();
    const plugin = createTsMdPlugin as unknown as LanguagePlugin<
      URI,
      TsMdVirtualFile
    >;
    let language!: Language<URI>;
    language = createLanguage<URI>([plugin], scripts, (id) => {
      if (scripts.has(id)) return;
      const snapshot = ts.ScriptSnapshot.fromString(
        fs.readFileSync(id.fsPath, 'utf8'),
      );
      language.scripts.set(id, snapshot, 'ts-md');
    });
    const service = createLanguageService(
      language,
      [],
      { workspaceFolders: [] },
      {},
    );
    language.scripts.get(URI.file(mainPath));
    expect(service).toBeDefined();
  });
});
```
