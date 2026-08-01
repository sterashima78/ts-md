# Graph

TypeScript AST から module specifier を収集し、`.ts.md` module graph の循環参照を検出します。

## split

```ts split
export function split(node: string): [string, string] {
  const index = node.lastIndexOf(':');
  return [node.slice(0, index), node.slice(index + 1)];
}
```

## collectModuleSpecifiers

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

## dfs

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

## detectCycle

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

## 公開インタフェース

```ts main
export { collectModuleSpecifiers } from ':collectModuleSpecifiers';
export { detectCycle } from ':detectCycle';
```
