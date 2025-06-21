# Tangle

Markdown から抽出したチャンクを実際のファイルへ書き出すユーティリティです。

## tangle: チャンクの書き出し

指定ディレクトリ内にチャンクごとのファイルを生成します。返り値は書き出したファイルのパス一覧です。

```ts tangle
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ChunkDict } from './parser.ts.md';
import { escapeChunk } from './utils.ts.md';

export async function tangle(
  dict: ChunkDict,
  baseFile: string,
  outDir: string,
  rename?: (chunk: string) => string,
): Promise<string[]> {
  const baseName = path.basename(baseFile, path.extname(baseFile));
  const baseOut = path.join(outDir, baseName);
  await fs.mkdir(baseOut, { recursive: true });
  const written: string[] = [];

  for (const [chunk, code] of Object.entries(dict)) {
    const rel = rename ? rename(chunk) : `${escapeChunk(chunk)}.ts`;
    const filePath = path.join(baseOut, rel);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, code, 'utf8');
    written.push(filePath);
  }

  return written;
}
```

## 公開インタフェース

```ts main
export { tangle } from ':tangle';
```
