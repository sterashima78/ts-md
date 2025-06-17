import type { ChunkDict } from './parser';
import { resolveImport } from './resolver';

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

function split(node: string): [string, string] {
  const idx = node.lastIndexOf(':');
  return [node.slice(0, idx), node.slice(idx + 1)];
}
