# Tangle

Markdown から抽出したチャンクを実際のファイルへ書き出すユーティリティです。

## prepareOutput: 出力ディレクトリ作成

基準ファイル名からディレクトリを決定し、存在しなければ生成します。

```ts prepareOutput
import fs from 'node:fs/promises';
import path from 'node:path';

export async function prepareOutput(baseFile: string, outDir: string): Promise<string> {
  const baseName = path.basename(baseFile, path.extname(baseFile));
  const baseOut = path.join(outDir, baseName);
  await fs.mkdir(baseOut, { recursive: true });
  return baseOut;
}
```

## tangle: チャンクの書き出し

指定ディレクトリ内にチャンクごとのファイルを生成します。返り値は書き出したファイルのパス一覧です。

```ts tangle
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ChunkDict } from './parser.ts.md';
import { escapeChunk } from './utils.ts.md';
import { prepareOutput } from ':prepareOutput';

export async function tangle(
  dict: ChunkDict,
  baseFile: string,
  outDir: string,
  rename?: (chunk: string) => string,
): Promise<string[]> {
  const baseOut = await prepareOutput(baseFile, outDir);
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

```ts tangle.test
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tangle } from ':tangle';

describe('tangle', () => {
  it('writes files', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tangle-'));
    const dict = { foo: 'export const a = 1' };
    const out = await tangle(dict, '/doc.ts.md', tmp);
    const file = out[0];
    const content = await fs.readFile(file, 'utf8');
    expect(content.trim()).toBe('export const a = 1');
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
```

## 公開インタフェース

```ts main
export { tangle } from ':tangle';

if (import.meta.vitest) {
  await import(':tangle.test');
}
```

