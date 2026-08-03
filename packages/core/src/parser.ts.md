# Parsing a TS-MD document

TS-MD の parser は Markdown を単なるコード抽出用の容器として扱いません。説明文を含む document 全体を Markdown として解析し、その中に現れる TypeScript fence だけを実行可能な module として取り出します。

ここで守る不変条件は次の三つです。

- 一つの TypeScript fence は一つの独立した module である
- すべての TypeScript fence は有効で一意な module 名を持つ
- module の位置情報は、元 Markdown 上のコード本文だけを正確に指す

処理は Markdown AST の構築、module の抽出、利用目的別の形への変換という順に進みます。

## The document model

parser が返す中心的な値は `TsMdDocument` です。module はコードだけでなく、言語と元 document 上の範囲を保持します。language service はこの範囲を使って diagnostics や補完位置を Markdown へ戻します。

`ChunkDict` と `ChunkInfo` は既存 API との互換用の別名です。新しい処理は `TsMdDocument` を基準に組み立てます。

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

## Building the Markdown tree

最初に Sätteri で Markdown を MDAST へ変換します。TS-MD が受け入れる Markdown の範囲を parser の置き換え前後で変えないため、Sätteri で既定有効の GFM と frontmatter は明示的に無効化します。

Sätteri が公開する `MdastNode` は MDAST node 全体の判別可能な union です。ここでは `type` discriminant から root node を導出し、parser の実装が利用する AST 型を Sätteri の公開 API に揃えます。

root 以外が返ることは API 上想定していませんが、後続処理の前提を曖昧にしないために境界で検証します。

```ts buildAst
import type { MdastNode } from 'satteri';
import { markdownToMdast } from 'satteri';

type MdastRoot = Extract<MdastNode, { type: 'root' }>;

export function buildAst(markdown: string): MdastRoot {
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

## Turning fences into modules

MDAST を再帰的に歩き、`ts` または `tsx` の code node だけを選びます。TypeScript fence の meta 部分を module 名として読み、空の名前、不正な文字、重複を document の構造エラーとして早い段階で拒否します。

位置情報では code node 全体ではなく本文を指す必要があります。opening fence の次の行から node の value を探し、Markdown parser が返す node range を越えない範囲で本文の開始位置を決めます。同じ文字列が fence header より前に現れても誤って採用しないための処理です。

```ts extractModules
import type { MdastNode } from 'satteri';
import { extIsTs } from './utils.ts.md';
import type { TsMdLanguage, TsMdModule } from ':types';
import { TsMdParseError } from ':types';

type MdastCode = Extract<MdastNode, { type: 'code' }>;
type MdastRoot = Extract<MdastNode, { type: 'root' }>;

const MODULE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function visitCodeNodes(
  node: MdastNode,
  callback: (codeNode: MdastCode) => void,
): void {
  if (node.type === 'code') callback(node);
  if (!('children' in node)) return;
  for (const child of node.children) visitCodeNodes(child, callback);
}

export function extractModules(
  tree: MdastRoot,
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

## Assembling the document

AST と抽出規則を一つの関数にまとめます。以後の package は Markdown parser の詳細に触れず、この document model だけを共有します。

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

## Compatibility views

一部の呼び出し側は module 配列ではなく名前を key にした辞書を必要とします。別の parser を持たず、常に `parseDocument` の結果から派生させることで、名前の検証や位置計算を一度だけ行います。

コードだけを必要とする場合は `parseChunks` を使います。

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

位置情報を含む module 全体が必要な場合は `parseChunkInfos` を使います。

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

## Public surface

公開 API では document model を中心に置きつつ、既存の辞書 API も同じ実装から提供します。AST 構築や node traversal は parser 内部の手順なので公開しません。

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
