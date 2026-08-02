# Tangling documents from the command line

`tsmd tangle` は、CLI の入力である glob pattern と、core の入力である `TsMdDocument` をつなぎます。

file system の探索、Markdown の読み込み、構文解析、module file の生成を順に並べています。それぞれの規則は既存の component に委譲し、この command 自体は複数 document を反復して結果を表示する orchestration に留めます。

## Processing matched documents

最初に glob を絶対 path の一覧へ展開します。各 file は UTF-8 の Markdown として読み、core parser で document model に変換してから tangle します。

parser と tangle を分けて呼ぶことで、構文 error は file を書き始める前に検出されます。書き込まれた path は core から返された実際の結果を表示し、CLI 側で出力名を再計算しません。

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

## Public command function

CLI entrypoint には orchestration function だけを公開します。単一 module の命名や書き込みは core の責務です。

```ts main
export { runTangle } from ':runTangle';
```
