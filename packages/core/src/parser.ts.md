# Parser

Markdown ファイルから TypeScript コードブロックを抽出するモジュールです。

## 型定義

コードを保持する `ChunkDict` と、位置情報付きの `ChunkInfo` を定義します。

```ts types
export interface ChunkDict {
  [name: string]: string;
}

export interface ChunkInfo {
  code: string;
  start: number;
  end: number;
}
```

## buildAst: AST の構築

Markdown 文字列から `mdast` の AST を生成します。

```ts buildAst
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { Root } from 'mdast';

export function buildAst(markdown: string): Root {
  return unified().use(remarkParse).parse(markdown) as Root;
}
```

## extractChunks: チャンク抽出処理

生成した AST を走査し、`ts`/`tsx` コードブロックを `ChunkDict` に蓄積します。

```ts extractChunks
import type { Code, Html, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils.ts.md';
import type { ChunkDict } from ':types';

export function extractChunks(tree: Root, markdown: string): ChunkDict {
  const dict: ChunkDict = {};
  let pendingFile: string | null = null;
  visit(tree, (node) => {
    if (node.type === 'html') {
      const m = /<!--\s*file:\s*([^>]+)-->/.exec((node as Html).value ?? '');
      if (m) {
        pendingFile = m[1].trim();
      }
    }

    if (node.type === 'code' && extIsTs((node as Code).lang ?? '')) {
      const name = ((node as Code).meta ?? '').trim();
      if (!name) return;
      const key = pendingFile ?? name;
      if (dict[key]) {
        dict[key] += `\n${(node as Code).value}`;
      } else {
        dict[key] = (node as Code).value;
      }
      pendingFile = null;
    }
  });
  return dict;
}
```

## parseChunks: コードチャンクの抽出

`remark-parse` で AST を構築し、`ts`/`tsx` コードブロックを `ChunkDict` にまとめます。

```ts parseChunks
import type { Root } from 'mdast';
import type { ChunkDict } from ':types';
import { buildAst } from ':buildAst';
import { extractChunks } from ':extractChunks';

export function parseChunks(markdown: string, uri: string): ChunkDict {
  const tree: Root = buildAst(markdown);
  return extractChunks(tree, markdown);
}
```

## extractChunkInfos: 位置情報付き抽出処理

AST を走査して各チャンクの開始位置と終了位置を記録します。

```ts extractChunkInfos
import type { Code, Html, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils.ts.md';
import type { ChunkInfo } from ':types';

export function extractChunkInfos(
  tree: Root,
  markdown: string,
): Record<string, ChunkInfo> {
  const dict: Record<string, ChunkInfo> = {};
  let pendingFile: string | null = null;
  visit(tree, (node) => {
    if (node.type === 'html') {
      const value = (node as Html).value ?? '';
      const m = /<!--\s*file:\s*([^>]+)-->/.exec(value);
      if (m) {
        pendingFile = m[1].trim();
      }
    }

    if (node.type === 'code' && extIsTs((node as Code).lang ?? '')) {
      const meta = (node as Code).meta ?? '';
      const name = meta.trim();
      if (!name) return;
      const key = pendingFile ?? name;
      const pos = node.position;
      const start = pos?.start.offset ?? 0;
      const end = pos?.end.offset ?? start + (node as Code).value.length;
      const full = markdown.slice(start, end);
      const idx = full.indexOf((node as Code).value);
      const codeStart = idx === -1 ? start : start + idx;
      const code = (node as Code).value;
      if (dict[key]) {
        const prev = dict[key];
        prev.code += `\n${code}`;
        prev.end = codeStart + code.length;
      } else {
        dict[key] = { code, start: codeStart, end: codeStart + code.length };
      }
      pendingFile = null;
    }
  });
  return dict;
}
```

## parseChunkInfos: 位置情報付き抽出

コードブロックの開始位置と終了位置を含めて取得するバリエーションです。

```ts parseChunkInfos
import type { Root } from 'mdast';
import type { ChunkInfo } from ':types';
import { buildAst } from ':buildAst';
import { extractChunkInfos } from ':extractChunkInfos';

export function parseChunkInfos(
  markdown: string,
  uri: string,
): Record<string, ChunkInfo> {
  const tree: Root = buildAst(markdown);
  return extractChunkInfos(tree, markdown);
}
```

## 公開インタフェース

```ts main
export { parseChunks } from ':parseChunks';
export { parseChunkInfos } from ':parseChunkInfos';
export type { ChunkDict, ChunkInfo } from ':types';

if (import.meta.vitest) {
  await import(':parser.test');
}
```

## Tests

```ts parser.test
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseChunks } from ':parseChunks';
import { parseChunkInfos } from ':parseChunkInfos';

describe('parseChunks', () => {
  const md = [
    '# Title',
    '',
    '`' + '`' + '`' + 'ts foo',
    'console.log(1)',
    '`' + '`' + '`',
    '',
    '<!-- file: path/to/bar.ts -->',
    '`' + '`' + '`' + 'ts bar',
    'console.log(2)',
    '`' + '`' + '`',
    '',
    '`' + '`' + '`' + 'ts foo',
    'console.log(3)',
    '`' + '`' + '`',
  ].join('\n');

  const dict = parseChunks(md, '/doc.ts.md');
  it('extracts named chunks', () => {
    expect(Object.keys(dict)).toEqual(['foo', 'path/to/bar.ts']);
    expect(dict.foo.trim().split('\n').length).toBe(2);
  });
});

describe('parseChunkInfos', () => {
  const md = [
    '# Title',
    '',
    '`' + '`' + '`' + 'ts foo',
    'console.log(1)',
    '`' + '`' + '`',
    '',
    '<!-- file: path/to/bar.ts -->',
    '`' + '`' + '`' + 'ts bar',
    'console.log(2)',
    '`' + '`' + '`',
    '',
    '`' + '`' + '`' + 'ts foo',
    'console.log(3)',
    '`' + '`' + '`',
  ].join('\n');

  const dict = parseChunkInfos(md, '/doc.ts.md');
  it('includes start and end offsets', () => {
    expect(dict.foo.start).toBeLessThan(dict.foo.end);
    expect(dict.foo.code).toContain('console.log(3)');
    expect(dict['path/to/bar.ts'].code).toContain('console.log(2)');
  });
});

describe('parseChunks with fixture', () => {
  it('parses doc fixture', async () => {
    const dir = path.join(process.cwd(), 'test', 'fixtures');
    const file = path.join(dir, 'doc.ts.md');
    const md = await fs.readFile(file, 'utf8');
    const dict = parseChunks(md, file);
    expect(dict.main).toContain("import './dep.ts.md'");
  });
});
```
