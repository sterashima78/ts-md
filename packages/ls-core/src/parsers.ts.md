# Parsers

Language service で使用する簡易パーサー群です。

## getChunkDict: チャンク辞書の生成

```ts getChunkDict
import { parseChunks } from '@sterashima78/ts-md-core';
import type ts from 'typescript';

/** キャッシュ付きで Markdown をチャンク辞書へ変換 */
export function getChunkDict(snapshot: ts.IScriptSnapshot, uri: string) {
  const text = snapshot.getText(0, snapshot.getLength());
  const chunks = parseChunks(text, uri);
  const dict: Record<string, string> = {};
  for (const [name, chunk] of Object.entries(chunks)) {
    dict[name] = chunk;
  }
  return dict;
}
```

## getChunkInfoDict: 位置情報付き辞書

```ts getChunkInfoDict
import { parseChunkInfos } from '@sterashima78/ts-md-core';
import type ts from 'typescript';
import type { ChunkInfo } from '@sterashima78/ts-md-core';

export function getChunkInfoDict(snapshot: ts.IScriptSnapshot, uri: string) {
  const text = snapshot.getText(0, snapshot.getLength());
  return parseChunkInfos(text, uri);
}
```

## 公開インタフェース

```ts main
export { getChunkDict } from ':getChunkDict';
export { getChunkInfoDict } from ':getChunkInfoDict';
export type { ChunkInfo } from '@sterashima78/ts-md-core';
```
