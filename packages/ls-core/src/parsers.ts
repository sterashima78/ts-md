import { parseChunks } from '@sterashima78/ts-md-core';
import type ts from 'typescript';

/** キャッシュ付きで Markdown をチャンク辞書へ */
export function getChunkDict(snapshot: ts.IScriptSnapshot, uri: string) {
  const text = snapshot.getText(0, snapshot.getLength());
  const chunks = parseChunks(text, uri);
  const dict: Record<string, string> = {};
  for (const [name, chunk] of Object.entries(chunks)) {
    dict[name] = chunk.code;
  }
  return dict;
}
