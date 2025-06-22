# Tangle

Markdown から抽出したチャンクを実際のファイルへ書き出すユーティリティです。

## prepareOutputDir: 出力先準備

書き出し先ディレクトリを作成します。

```ts prepareOutputDir
import fs from 'node:fs/promises';
import path from 'node:path';
import { escapeChunk } from './utils.ts.md';

export async function prepareOutputDir(baseFile: string, outDir: string) {
  const baseName = path.basename(baseFile, path.extname(baseFile));
  const baseOut = path.join(outDir, baseName);
  await fs.mkdir(baseOut, { recursive: true });
  return baseOut;
}
```

## writeChunk: ファイルへの書き出し

単一チャンクを指定パスへ書き込みます。

```ts writeChunk
import fs from 'node:fs/promises';
import path from 'node:path';
import { escapeChunk } from './utils.ts.md';

export async function writeChunk(
  baseOut: string,
  chunk: string,
  code: string,
  rename?: (chunk: string) => string,
) {
  const rel = rename ? rename(chunk) : `${escapeChunk(chunk)}.ts`;
  const filePath = path.join(baseOut, rel);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, code, 'utf8');
  return filePath;
}
```

## tangle: チャンクの書き出し

指定ディレクトリ内にチャンクごとのファイルを生成します。返り値は書き出したファイルのパス一覧です。

```ts tangle
import type { ChunkDict } from './parser.ts.md';
import { escapeChunk } from './utils.ts.md';
import { prepareOutputDir } from ':prepareOutputDir';
import { writeChunk } from ':writeChunk';

export async function tangle(
  dict: ChunkDict,
  baseFile: string,
  outDir: string,
  rename?: (chunk: string) => string,
): Promise<string[]> {
  const baseOut = await prepareOutputDir(baseFile, outDir);
  const written: string[] = [];

  for (const [chunk, code] of Object.entries(dict)) {
    const filePath = await writeChunk(
      baseOut,
      escapeChunk(chunk),
      code,
      rename,
    );
    written.push(filePath);
  }

  return written;
}
```

## 公開インタフェース

```ts main
export { tangle } from ':tangle';

if (import.meta.vitest) {
  await import(':tangle.test');
}
```

## Tests

```ts tangle.test
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseChunks } from './parser.ts.md';
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

  it('writes fixture chunk', async () => {
    const dir = path.join(process.cwd(), 'test', 'fixtures');
    const file = path.join(dir, 'dep.ts.md');
    const md = await fs.readFile(file, 'utf8');
    const dict = parseChunks(md, file);
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tangle-fixture-'));
    await tangle(dict, file, tmp);
    const content = await fs.readFile(
      path.join(tmp, 'dep.ts', 'main.ts'),
      'utf8',
    );
    expect(content.trim()).toBe('export const msg = 1');
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
```
