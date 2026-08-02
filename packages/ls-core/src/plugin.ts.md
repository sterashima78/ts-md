# Connecting TS-MD to Volar and TypeScript

この language plugin は、Markdown document、Volar の virtual code、TypeScript の service script という三つの見方を接続します。

一つの `.ts.md` document は Volar では一つの root virtual file ですが、TypeScript には各 code fence を独立 module として見せます。`main` module は document の代表 service script、その他の module は extra service script になります。document に `main` がなくても named module の型検査を失わないよう、空の document service script を用意します。

実装を読みやすくするため、値の正規化、service script の選択、import resolution、plugin 本体の順に組み立てます。

## Normalizing file and module names

Volar の API は file name を URI-like object として渡す場合と文字列で渡す場合があります。最初に path へ正規化し、embedded code の ID から module 名を取り出す処理も同じ場所に置きます。

```ts fileNames
import { parseVirtualModuleFileName } from '@sterashima78/ts-md-core';
import type { VirtualCode } from '@volar/language-core';

export function getFileName(fileName: unknown): string {
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

export function getModuleName(code: VirtualCode): string | undefined {
  return parseVirtualModuleFileName(code.id)?.moduleName;
}
```

## Describing TypeScript service scripts

TypeScript は `.ts` と `.tsx` で parser mode が異なるため、元 fence の language から extension と `ScriptKind` を決めます。

embedded code は core と同じ仮想 module ID で検索します。`main` が存在しない document には、Markdown root 自体を TypeScript source と誤解させないため、内容が `export {};` だけの service code を返します。

```ts serviceScripts
import { createVirtualModuleFileName } from '@sterashima78/ts-md-core';
import type { VirtualCode } from '@volar/language-core';
import ts from 'typescript';
import { TsMdVirtualFile } from './virtual-file.ts.md';

export function getScriptKind(root: TsMdVirtualFile, moduleName: string) {
  return root.getModule(moduleName)?.language === 'tsx'
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
}

export function getExtension(root: TsMdVirtualFile, moduleName: string) {
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

export function getMainCode(root: TsMdVirtualFile) {
  return findModuleCode(root, 'main');
}

export function createDocumentServiceCode(root: TsMdVirtualFile): VirtualCode {
  const code = 'export {};';
  return {
    id: `${root.fileName}.__tsmd_document__.ts`,
    languageId: 'typescript',
    mappings: [],
    embeddedCodes: [],
    linkedCodeMappings: [],
    snapshot: ts.ScriptSnapshot.fromString(code),
  };
}
```

## Resolving imports for TypeScript

core resolver は TS-MD specifier を document path と module 名へ変換します。`main` module は document path 自体で TypeScript project に参加し、named module は仮想 file name で参加します。

この区別により、`import './other.ts.md'` は通常の source document として扱われ、`import ':types'` のような named module だけが extra service script を直接参照します。

```ts resolveTsMdFileName
import {
  createVirtualModuleFileName,
  resolveImport,
} from '@sterashima78/ts-md-core';
import { getFileName } from ':fileNames';

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
```

## The language plugin

plugin 本体は lifecycle の接着に集中します。

- `.ts.md` file を `ts-md` language として認識する
- snapshot から `TsMdVirtualFile` を作り、編集時は同じ instance を更新する
- `main` を primary service script として返す
- それ以外の TypeScript embedded code を extra service script として列挙する
- import resolution を共通 resolver へ委譲する

editor 用と compiler 用で別実装を持たず、同じ plugin object を公開します。

```ts main
import type { LanguagePlugin } from '@volar/language-core';
import { forEachEmbeddedCode } from '@volar/language-core';
import type { TypeScriptExtraServiceScript } from '@volar/typescript';
import ts from 'typescript';
import { TsMdVirtualFile } from './virtual-file.ts.md';
import { getFileName, getModuleName } from ':fileNames';
import {
  createDocumentServiceCode,
  getExtension,
  getMainCode,
  getScriptKind,
} from ':serviceScripts';
import { resolveTsMdFileName } from ':resolveTsMdFileName';

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
      const main = getMainCode(root);
      if (!main) {
        return {
          code: createDocumentServiceCode(root),
          extension: '.ts',
          scriptKind: ts.ScriptKind.TS,
        };
      }
      return {
        code: main,
        extension: getExtension(root, 'main'),
        scriptKind: getScriptKind(root, 'main'),
      };
    },

    getExtraServiceScripts(
      _fileName: string,
      root: TsMdVirtualFile,
    ): TypeScriptExtraServiceScript[] {
      const main = getMainCode(root);
      const scripts: TypeScriptExtraServiceScript[] = [];
      for (const code of forEachEmbeddedCode(root)) {
        if (code.languageId !== 'typescript' || code === main) continue;
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
```
