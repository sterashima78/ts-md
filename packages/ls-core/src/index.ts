import { collectVirtualFiles } from '@sterashima78/ts-md-core';
import type {
  EmbeddedLanguagePlugin,
  IScriptSnapshot,
  VirtualCode,
} from './types';

function createSnapshot(text: string): IScriptSnapshot {
  return {
    getText: (start, end) => text.substring(start, end),
    getLength: () => text.length,
    getChangeRange: () => undefined,
  };
}

export function createTsMdPlugin(): EmbeddedLanguagePlugin {
  return {
    getLanguageId(fileName) {
      if (fileName.endsWith('.ts.md')) return 'ts-markdown';
      return undefined;
    },
    createVirtualCode(fileName, languageId, snapshot) {
      if (languageId !== 'ts-markdown') return undefined;
      const files = collectVirtualFiles(fileName);
      const embeddedCodes: VirtualCode[] = [];
      for (const chunk of Object.values(files)) {
        embeddedCodes.push({
          id: `${chunk.file}:${chunk.name}`,
          languageId: 'typescript',
          snapshot: createSnapshot(chunk.code),
        });
      }
      return {
        id: fileName,
        languageId,
        snapshot,
        embeddedCodes,
      };
    },
  };
}
