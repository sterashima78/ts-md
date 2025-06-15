import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LanguagePlugin } from '@volar/language-core';
import ts from 'typescript';
import { getChunkDict } from './parsers.js';
import { TsMdVirtualFile } from './virtual-file.js';

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
    return new TsMdVirtualFile(snapshot, uri, filePath, dict);
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
    if (!specifier.startsWith('#')) return;
    const body = specifier.slice(1);
    const idx = body.lastIndexOf(':');
    if (idx === -1) return;
    const rel = body.slice(0, idx);
    const chunk = body.slice(idx + 1);
    const baseFile =
      typeof fromFile === 'string'
        ? fromFile
        : (fromFile as unknown as { fsPath: string }).fsPath;
    const abs = path.resolve(path.dirname(baseFile), rel);
    return `#${pathToFileURL(abs).href}:${chunk}`;
  },
  typescript: {
    extraFileExtensions: [
      {
        extension: 'ts.md',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.TS,
      },
    ],
    getServiceScript(root: TsMdVirtualFile) {
      return {
        code: root,
        extension: '.ts',
        scriptKind: ts.ScriptKind.TS,
      };
    },
  },
} as LanguagePlugin<string, TsMdVirtualFile> & {
  resolveFileName(specifier: string, fromFile: string): string | undefined;
};
