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

## detectCycle: 深さ優先探索による循環検出

`entry` を起点に依存チャンクを辿り、循環が見つかった場合はその経路を返します。

```ts detectCycle
import type { ChunkDict } from './parser.ts.md';
import { resolveImport } from './resolver.ts.md';
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
      const importRegex = /import\s+(?:.+?\s+from\s+)?['"]([^'"\n]+)['"]/g;
      let m: RegExpExecArray | null = null;
      while (true) {
        m = importRegex.exec(code);
        if (!m) break;
        const info = resolveImport(m[1], file);
        if (info) {
          const child = `${info.absPath}:${info.chunk}`;
          const res = dfs(child);
          if (res) return res;
        }
      }
    }
    stack.pop();
    return null;
  }

  return dfs(entry);
}
```

## 公開インタフェース

```ts main
export { detectCycle } from ':detectCycle';
```
