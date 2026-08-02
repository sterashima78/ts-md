# Adapting snapshots to the core document parser

Language service は file content を文字列ではなく `IScriptSnapshot` として受け取ります。一方、TS-MD の構文規則は core の `parseDocument` に集約されています。

この document は両者の間に薄い境界を作ります。Markdown の解析規則を language service 側へ複製せず、snapshot を文字列へ戻した後は常に core の document model を使います。

## Reading one document from a snapshot

snapshot 全体を読み、URI とともに parser へ渡します。位置情報は同じ文字列上で計算されるため、Volar の mapping にそのまま利用できます。

```ts getDocument
import { parseDocument } from '@sterashima78/ts-md-core';
import type ts from 'typescript';

export function getDocument(snapshot: ts.IScriptSnapshot, uri: string) {
  const text = snapshot.getText(0, snapshot.getLength());
  return parseDocument(text, uri);
}
```

## Deriving the code-only view

古い呼び出し側や単純な lookup では、module 名から code を引ける辞書が便利です。別の parser を実装せず、document model から必要な view だけを作ります。

```ts getChunkDict
import type { TsMdModule } from '@sterashima78/ts-md-core';
import type ts from 'typescript';
import { getDocument } from ':getDocument';

export function getChunkDict(snapshot: ts.IScriptSnapshot, uri: string) {
  return Object.fromEntries(
    getDocument(snapshot, uri).modules.map((module: TsMdModule) => [
      module.name,
      module.code,
    ]),
  );
}
```

## Preserving source positions

mapping や diagnostics には code だけでなく元 Markdown 上の range が必要です。この view では `TsMdModule` 全体を名前で参照できる形にします。

```ts getChunkInfoDict
import type { TsMdModule } from '@sterashima78/ts-md-core';
import type ts from 'typescript';
import { getDocument } from ':getDocument';

export function getChunkInfoDict(snapshot: ts.IScriptSnapshot, uri: string) {
  return Object.fromEntries(
    getDocument(snapshot, uri).modules.map((module: TsMdModule) => [
      module.name,
      module,
    ]),
  );
}
```

## Public compatibility surface

中心となる API は `getDocument` です。辞書形式も同じ解析結果から提供し、`ChunkInfo` は core の `TsMdModule` と同じ型であることを明示します。

```ts main
export { getChunkDict } from ':getChunkDict';
export { getChunkInfoDict } from ':getChunkInfoDict';
export { getDocument } from ':getDocument';
export type { TsMdModule as ChunkInfo } from '@sterashima78/ts-md-core';
```
