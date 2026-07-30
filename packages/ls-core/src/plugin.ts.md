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
```
