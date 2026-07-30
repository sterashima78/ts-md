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

```ts buildAst
import type { Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export function buildAst(markdown: string): Root {
  return unified().use(remarkParse).parse(markdown) as Root;
}
```

## extractModules: module の抽出

TypeScript コードフェンスには一意な module 名が必要です。同名フェンスの結合は行いません。

```ts extractModules
import type { Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { extIsTs } from './utils.ts.md';
import type { TsMdLanguage, TsMdModule } from ':types';
import { TsMdParseError } from ':types';

const MODULE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function extractModules(
  tree: Root,
  markdown: string,
  uri: string,
): TsMdModule[] {
  const modules: TsMdModule[] = [];
  const names = new Set<string>();

  visit(tree, (node) => {
    if (node.type !== 'code') return;
    const codeNode = node as Code;
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
    const full = markdown.slice(start, end);
    const index = full.indexOf(codeNode.value);
    const codeStart = index === -1 ? start : start + index;

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
