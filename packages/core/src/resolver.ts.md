# Resolver

ts.md の import 文字列を絶対パスとチャンク名に分解するユーティリティです。

## resolveImport: import 解析

```ts resolveImport
import path from 'node:path';

export function resolveImport(
  specifier: string,
  importer: string,
): { absPath: string; chunk: string } | undefined {
  const cleanImporter = importer
    .replace(/^\0?ts-md:/, '')
    .replace(/\?.*$/, '')
    .replace(/__[^/]+\.ts$/, '');

  if (specifier.endsWith('.ts.md') && !specifier.includes(':')) {
    const absPath = path.resolve(path.dirname(cleanImporter), specifier);
    return { absPath, chunk: 'main' };
  }

  if (!(specifier.includes('.ts.md:') || specifier.startsWith(':'))) {
    return undefined;
  }
  const idx = specifier.lastIndexOf(':');
  if (idx === -1) return undefined;
  const rel = specifier.slice(0, idx);
  const chunk = specifier.slice(idx + 1);
  if (!chunk) return undefined;
  const absPath = rel
    ? path.resolve(path.dirname(cleanImporter), rel)
    : cleanImporter;
  if (path.resolve(absPath) !== path.resolve(cleanImporter)) {
    return undefined;
  }
  return { absPath, chunk };
}
```

## 公開インタフェース

```ts main
export { resolveImport } from ':resolveImport';
```
