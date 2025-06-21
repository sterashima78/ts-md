# Graph

依存グラフを探索して循環参照を検出するモジュールです。

## split: ノード文字列の分解

ノードは `file:chunk` という形式で与えられるため、末尾の `:` を境にファイル名とチャンク名へ分けます。

```ts split
export function split(node: string): [string, string] {
  const idx = node.lastIndexOf(':');
  return [node.slice(0, idx), node.slice(idx + 1)];
}
```

## collectDependencies: import 抽出

コード中の `import` 文から依存チャンクを列挙します。

```ts collectDependencies
import { resolveImport } from './resolver.ts.md';

export function collectDependencies(code: string, file: string): string[] {
  const deps: string[] = [];
  const importRegex = /import\s+(?:.+?\s+from\s+)?['"]([^'"\n]+)['"]/g;
  let m: RegExpExecArray | null = null;
  while ((m = importRegex.exec(code))) {
    const info = resolveImport(m[1], file);
    if (info) deps.push(`${info.absPath}:${info.chunk}`);
  }
  return deps;
}
```

## detectCycle: 深さ優先探索による循環検出

`entry` を起点に依存チャンクを辿り、循環が見つかった場合はその経路を返します。

```ts detectCycle
import type { ChunkDict } from './parser.ts.md';
import { collectDependencies } from ':collectDependencies';
import { split } from ':split';

export function detectCycle(
  entry: string,
  dictProvider: (file: string) => ChunkDict | undefined,
): string[] | null {
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): string[] | null {
    const idx = stack.indexOf(node);
    if (idx !== -1) return stack.slice(idx).concat(node);
    if (visited.has(node)) return null;
    visited.add(node);
    stack.push(node);
    const [file, chunk] = split(node);
    const dict = dictProvider(file);
    const code = dict?.[chunk];
    if (code) {
      for (const child of collectDependencies(code, file)) {
        const res = dfs(child);
        if (res) return res;
      }
    }
    stack.pop();
    return null;
  }

  return dfs(entry);
}
```

```ts detectCycle.test
import { describe, expect, it } from 'vitest';
import { detectCycle } from ':detectCycle';
import { resolveImport } from './resolver.ts.md';

describe('detectCycle', () => {
  it('detects no cycle', () => {
    const dicts = new Map<string, Record<string, string>>();
    dicts.set('/a.ts.md', { main: "import './b.ts.md'" });
    dicts.set('/b.ts.md', { main: 'export const x = 1' });
    const res = detectCycle('/a.ts.md:main', (f) => dicts.get(f));
    expect(res).toBeNull();
  });

  it('detects self cycle', () => {
    const dicts = new Map<string, Record<string, string>>();
    dicts.set('/a.ts.md', { main: "import './a.ts.md:main'" });
    const res = detectCycle('/a.ts.md:main', (f) => dicts.get(f));
    expect(res).toEqual(['/a.ts.md:main', '/a.ts.md:main']);
  });
});
```

## 公開インタフェース

```ts main
export { detectCycle } from ':detectCycle';

if (import.meta.vitest) {
  await import(':detectCycle.test');
}
