# tangle コマンド

`.ts.md` document を解析し、各コードフェンスを一つの TypeScript module ファイルへ展開します。

```ts runTangle
import fs from 'node:fs/promises';
import {
  parseDocument,
  tangle,
} from '@sterashima78/ts-md-core';
import { expandGlobs } from '../utils/globs.ts.md';

export async function runTangle(inputGlobs: string[], outDir = 'dist') {
  const files = await expandGlobs(inputGlobs);

  for (const file of files) {
    const markdown = await fs.readFile(file, 'utf8');
    const document = parseDocument(markdown, file);
    const written = await tangle(document, outDir);
    for (const target of written) console.log(`wrote ${target}`);
  }
}
```

```ts main
export { runTangle } from ':runTangle';
```
