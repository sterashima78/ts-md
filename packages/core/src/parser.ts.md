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

## parseChunks: コードチャンクの抽出

`remark-parse` で AST を構築し、`ts`/`tsx` コードブロックを `ChunkDict` にまとめます。

```ts parseChunks
import type { Code, Html } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils.ts.md';
import type { ChunkDict } from ':types';

export function parseChunks(markdown: string, uri: string): ChunkDict {
  const tree = unified().use(remarkParse).parse(markdown);
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

## parseChunkInfos: 位置情報付き抽出

コードブロックの開始位置と終了位置を含めて取得するバリエーションです。

```ts parseChunkInfos
import type { Code, Html, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils.ts.md';
import type { ChunkInfo } from ':types';

export function parseChunkInfos(
  markdown: string,
  uri: string,
): Record<string, ChunkInfo> {
  const tree = unified().use(remarkParse).parse(markdown) as Root;
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
```
