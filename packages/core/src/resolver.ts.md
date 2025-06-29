# Resolver

ts.md の import 文字列を絶対パスとチャンク名に分解するユーティリティです。

## cleanImporter: importer の整形

importer のパスから `ts-md:` やクエリなどの付加情報を取り除きます。

```ts cleanImporter
export function cleanImporter(importer: string): string {
  return importer
    .replace(/^\0?ts-md:/, '')
    .replace(/\?.*$/, '')
    .replace(/__[^/]+\.ts$/, '');
}
```

## resolveImport: import 解析

```ts resolveImport
import path from 'node:path';
import { cleanImporter } from ':cleanImporter';

export function resolveImport(
  specifier: string,
  importer: string,
): { absPath: string; chunk: string } | undefined {
  const base = cleanImporter(importer);

  if (specifier.endsWith('.ts.md') && !specifier.includes(':')) {
    const absPath = path.resolve(path.dirname(base), specifier);
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
    ? path.resolve(path.dirname(base), rel)
    : base;
  if (path.resolve(absPath) !== path.resolve(base)) {
    return undefined;
  }
  return { absPath, chunk };
}
```

## 公開インタフェース

```ts main
export { resolveImport } from ':resolveImport';

if (import.meta.vitest) {
  await import(':resolveImport.test');
}
```

## Tests

```ts resolveImport.test
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveImport } from ':resolveImport';

describe('resolveImport', () => {
  it('resolves relative path', () => {
    const res = resolveImport('./foo.ts.md', '/a/b/main.ts.md');
    expect(res).toEqual({ absPath: '/a/b/foo.ts.md', chunk: 'main' });
  });
  it('resolves parent dir', () => {
    const res = resolveImport('../foo.ts.md', '/a/b/c/app.ts.md');
    expect(res).toEqual({ absPath: '/a/b/foo.ts.md', chunk: 'main' });
  });
  it('resolves chunk in same file', () => {
    const res = resolveImport('./doc.ts.md:qux', '/a/b/doc.ts.md');
    expect(res).toEqual({ absPath: '/a/b/doc.ts.md', chunk: 'qux' });
  });
  it('resolves shorthand same-file import', () => {
    const res = resolveImport(':qux', '/a/b/doc.ts.md');
    expect(res).toEqual({ absPath: '/a/b/doc.ts.md', chunk: 'qux' });
  });
});

describe('resolveImport with fixture', () => {
  it('resolves fixture import', () => {
    const dir = path.join(process.cwd(), 'test', 'fixtures');
    const importer = path.join(dir, 'doc.ts.md');
    const res = resolveImport('./dep.ts.md', importer);
    expect(res).toEqual({ absPath: path.join(dir, 'dep.ts.md'), chunk: 'main' });
  });
});
```
