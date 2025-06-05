import path from 'node:path';
import type { LanguagePlugin } from '@volar/language-core';
import type ts from 'typescript';
import { getChunkDict } from './parsers.js';
import { TsMdVirtualFile } from './virtual-file.js';

export const tsMdLanguagePlugin = {
  getLanguageId(fileName) {
    return fileName.endsWith('.ts.md') ? 'ts-md' : undefined;
  },
  createVirtualCode(fileName, languageId, snapshot) {
    if (languageId !== 'ts-md') return;
    const dict = getChunkDict(snapshot, fileName);
    return new TsMdVirtualFile(snapshot, fileName, dict);
  },

  updateVirtualCode(fileName, oldFile, snapshot) {
    if (!fileName.endsWith('.ts.md')) return;
    const dict = getChunkDict(snapshot, fileName);
    oldFile.update(snapshot, dict);
    return oldFile;
  },

  resolveFileName(specifier, fromFile) {
    if (!specifier.startsWith('#')) return;
    const match = specifier.match(/^#([^:]+):(.+)$/);
    if (!match) return;
    const [, rel, chunk] = match;
    const abs = path.resolve(path.dirname(fromFile), rel);
    return `#${abs}:${chunk}`;
  },
} as LanguagePlugin<string, TsMdVirtualFile> & {
  resolveFileName(specifier: string, fromFile: string): string | undefined;
};
