# Parser

Markdown ファイル内の各 TypeScript コードフェンスを、独立した TypeScript module として解析します。

## 型定義

```ts types
export type TsMdLanguage = 'ts' | 'tsx';

export interface TsMdModule {
  name: string;
  language: TsMdLanguage;
  code: string;
  start: number;
  end: number;
}

export interface TsMdDocument {
  uri: string;
  modules: TsMdModule[];
}

export type ChunkDict = Record<string, string>;
export type ChunkInfo = TsMdModule;

export class TsMdParseError extends Error {
  constructor(
    message: string,
    public readonly uri: string,
    public readonly offset: number,
  ) {
    super(`${uri}:${offset}: ${message}`);
    this.name = 'TsMdParseError';
  }
}
```

## buildAst: AST の構築

Sätteri で Markdown を標準 MDAST に変換します。従来の `remark-parse` と同じ CommonMark の解析範囲を保つため、Sätteri で既定有効の GFM と frontmatter は無効化します。

```ts buildAst
import type { Root } from 'mdast';
import { markdownToMdast } from 'satteri';

export function buildAst(markdown: string): Root {
  const tree = markdownToMdast(markdown, {
    features: {
      frontmatter: false,
      gfm: false,
    },
  });
  if (tree.type !== 'root') {
    throw new TypeError(`Expected a Markdown root, got '${tree.type}'`);
  }
  return tree;
}
```

## extractModules: module の抽出

TypeScript コードフェンスには一意な module 名が必要です。同名フェンスの結合は行いません。

```ts extractModules
import type { Code, Root } from 'mdast';
import type { MdastNode } from 'satteri';
import { extIsTs } from './utils.ts.md';
import type { TsMdLanguage, TsMdModule } from ':types';
import { TsMdParseError } from ':types';

const MODULE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function visitCodeNodes(
  node: MdastNode,
  callback: (codeNode: Code) => void,
): void {
  if (node.type === 'code') callback(node);
  if (!('children' in node)) return;
  for (const child of node.children) visitCodeNodes(child, callback);
}

export function extractModules(
  tree: Root,
  markdown: string,
  uri: string,
): TsMdModule[] {
  const modules: TsMdModule[] = [];
  const names = new Set<string>();

  visitCodeNodes(tree, (codeNode) => {
    if (!extIsTs(codeNode.lang ?? '')) return;

    const offset = codeNode.position?.start.offset ?? 0;
    const name = (codeNode.meta ?? '').trim();
    if (!name) {
      throw new TsMdParseError(
        'TypeScript code fence requires a module name',
        uri,
        offset,
      );
    }
    if (!MODULE_NAME_PATTERN.test(name)) {
      throw new TsMdParseError(`Invalid module name '${name}'`, uri, offset);
    }
    if (names.has(name)) {
      throw new TsMdParseError(`Duplicate module '${name}'`, uri, offset);
    }
    names.add(name);

    const start = codeNode.position?.start.offset ?? 0;
    const end = codeNode.position?.end.offset ?? start + codeNode.value.length;
    const openingFenceEnd = markdown.indexOf('\n', start);
    const searchStart = openingFenceEnd === -1 ? start : openingFenceEnd + 1;
    const index = markdown.indexOf(codeNode.value, searchStart);
    const codeStart = index === -1 || index > end ? searchStart : index;

    modules.push({
      name,
      language: codeNode.lang as TsMdLanguage,
      code: codeNode.value,
      start: codeStart,
      end: codeStart + codeNode.value.length,
    });
  });

  return modules;
}
```

## parseDocument: document の解析

```ts parseDocument
import type { TsMdDocument } from ':types';
import { buildAst } from ':buildAst';
import { extractModules } from ':extractModules';

export function parseDocument(markdown: string, uri: string): TsMdDocument {
  const tree = buildAst(markdown);
  return {
    uri,
    modules: extractModules(tree, markdown, uri),
  };
}
```

## 既存の辞書形式への変換

```ts parseChunks
import type { ChunkDict } from ':types';
import { parseDocument } from ':parseDocument';

export function parseChunks(markdown: string, uri: string): ChunkDict {
  return Object.fromEntries(
    parseDocument(markdown, uri).modules.map((module) => [
      module.name,
      module.code,
    ]),
  );
}
```

```ts parseChunkInfos
import type { ChunkInfo } from ':types';
import { parseDocument } from ':parseDocument';

export function parseChunkInfos(
  markdown: string,
  uri: string,
): Record<string, ChunkInfo> {
  return Object.fromEntries(
    parseDocument(markdown, uri).modules.map((module) => [module.name, module]),
  );
}
```

## 公開インタフェース

```ts main
export { parseChunkInfos } from ':parseChunkInfos';
export { parseChunks } from ':parseChunks';
export { parseDocument } from ':parseDocument';
export type {
  ChunkDict,
  ChunkInfo,
  TsMdDocument,
  TsMdLanguage,
  TsMdModule,
} from ':types';
export { TsMdParseError } from ':types';
```
