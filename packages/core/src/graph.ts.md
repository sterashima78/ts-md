# Module dependency graph

`.ts.md` document の module 間依存を、TypeScript の構文から取り出して循環参照を検出します。

この文書では、依存グラフを最初から構築して保持しません。必要な module を訪れた時点でコードを解析し、その場で次の辺を見つけます。この遅延的な構成にすると、呼び出し側は document の読み込み方やキャッシュ戦略を `dictProvider` に閉じ込められます。

処理は次の順に組み立てます。

1. graph 上の node を document path と module 名へ戻す
2. TypeScript AST から静的に追跡できる module specifier を集める
3. 深さ優先探索で現在の探索経路への再入を見つける
4. entry point だけを受け取る小さな公開 API に包む

## Node identity

一つの node は `<document path>:<module name>` という文字列で表します。document path 自体に `:` が含まれる可能性があるため、最後の区切りだけを module 名との境界として扱います。

```ts split
export function split(node: string): [string, string] {
  const index = node.lastIndexOf(':');
  return [node.slice(0, index), node.slice(index + 1)];
}
```

この表現は graph 内部だけのものです。import specifier の解釈は resolver に任せ、graph が独自の解決規則を持たないようにします。

## Finding outgoing edges

依存辺として扱うのは、TypeScript が構文上 module specifier として表現する次の三種類です。

- `import ... from '...'`
- `export ... from '...'`
- 文字列リテラルを引数にした `import('...')`

動的に組み立てた specifier は静的には確定できないため、ここでは対象にしません。集合へ追加することで、同じ specifier が複数回現れても探索は一度にまとめます。

```ts collectModuleSpecifiers
import { Project, SyntaxKind } from 'ts-morph';

export function collectModuleSpecifiers(code: string): string[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile('/module.ts', code, {
    overwrite: true,
  });
  const specifiers = new Set<string>();

  for (const declaration of source.getImportDeclarations()) {
    specifiers.add(declaration.getModuleSpecifierValue());
  }
  for (const declaration of source.getExportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue();
    if (specifier) specifiers.add(specifier);
  }
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue;
    const argument = call.getArguments()[0]?.asKind(SyntaxKind.StringLiteral);
    if (argument) specifiers.add(argument.getLiteralValue());
  }

  return [...specifiers];
}
```

## Walking only TS-MD edges

探索中は二種類の履歴を分けます。

`visited` は探索済み node の集合で、同じ部分木を繰り返し調べないために使います。`stack` は現在たどっている経路で、この中に同じ node が現れた場合だけが循環です。循環を見つけたときは、再入した node から現在地までを切り出し、最後に始点をもう一度加えて閉路として返します。

コードの取得は `dictProvider` に委譲します。document がまだ読まれていない場合や対象 module が存在しない場合は辺を持たない node として扱います。また、通常の npm package や JavaScript module への import は `resolveImport` が `undefined` を返すため、この graph には入りません。

```ts dfs
import type { ChunkDict } from './parser.ts.md';
import { resolveImport } from './resolver.ts.md';
import { collectModuleSpecifiers } from ':collectModuleSpecifiers';
import { split } from ':split';

export function dfs(
  node: string,
  visited: Set<string>,
  stack: string[],
  dictProvider: (file: string) => ChunkDict | undefined,
): string[] | null {
  const cycleStart = stack.indexOf(node);
  if (cycleStart !== -1) return stack.slice(cycleStart).concat(node);
  if (visited.has(node)) return null;

  visited.add(node);
  stack.push(node);
  const [file, moduleName] = split(node);
  const code = dictProvider(file)?.[moduleName];

  if (code) {
    for (const specifier of collectModuleSpecifiers(code)) {
      const resolved = resolveImport(specifier, file);
      if (!resolved) continue;
      const child = `${resolved.absPath}:${resolved.chunk}`;
      const cycle = dfs(child, visited, stack, dictProvider);
      if (cycle) return cycle;
    }
  }

  stack.pop();
  return null;
}
```

## Starting a traversal

公開側では探索状態を呼び出しごとに新しく作ります。これにより、同じ provider を使って複数の entry point を検査しても結果が混ざりません。

```ts detectCycle
import type { ChunkDict } from './parser.ts.md';
import { dfs } from ':dfs';

export function detectCycle(
  entry: string,
  dictProvider: (file: string) => ChunkDict | undefined,
): string[] | null {
  return dfs(entry, new Set<string>(), [], dictProvider);
}
```

## Public surface

AST 解析は他の用途でも再利用できるため公開します。一方、`split` と `dfs` は graph 表現と探索手順の詳細なので、この document の内部 module に留めます。

```ts main
export { collectModuleSpecifiers } from ':collectModuleSpecifiers';
export { detectCycle } from ':detectCycle';
```
