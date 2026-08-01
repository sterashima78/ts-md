# Parsers

Language Service から core の document parser を利用するための薄いアダプターです。

```ts getDocument
import { parseDocument } from '@sterashima78/ts-md-core';
import type ts from 'typescript';

export function getDocument(snapshot: ts.IScriptSnapshot, uri: string) {
  const text = snapshot.getText(0, snapshot.getLength());
  return parseDocument(text, uri);
}
```

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

```ts main
export { getChunkDict } from ':getChunkDict';
export { getChunkInfoDict } from ':getChunkInfoDict';
export { getDocument } from ':getDocument';
export type { TsMdModule as ChunkInfo } from '@sterashima78/ts-md-core';
```
