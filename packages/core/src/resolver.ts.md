# Resolver

`.ts.md` module specifier を document path と module 名へ解決します。

## cleanImporter

```ts cleanImporter
import { fileURLToPath } from 'node:url';
import { parseVirtualModuleFileName } from './module-id.ts.md';

export function cleanImporter(importer: string): string {
  const virtualModule = parseVirtualModuleFileName(importer);
  if (virtualModule) return virtualModule.documentPath;

  if (importer.startsWith('file:')) {
    try {
      return fileURLToPath(importer);
    } catch {
      return importer;
    }
  }

  return importer.replace(/\?.*$/, '');
}
```

## resolveImport

同じ document 内の module は `:module`、別 document の module は `./file.ts.md:module` で参照します。module 指定を省略した `.ts.md` import は `main` を参照します。

```ts resolveImport
import path from 'node:path';
import { cleanImporter } from ':cleanImporter';

export interface ResolvedTsMdImport {
  absPath: string;
  chunk: string;
}

export function resolveImport(
  specifier: string,
  importer: string,
): ResolvedTsMdImport | undefined {
  const base = cleanImporter(importer);

  if (specifier.startsWith(':')) {
    const chunk = specifier.slice(1);
    if (!chunk) return;
    return { absPath: path.resolve(base), chunk };
  }

  const marker = '.ts.md:';
  const markerIndex = specifier.lastIndexOf(marker);
  if (markerIndex !== -1) {
    const documentSpecifier = specifier.slice(
      0,
      markerIndex + '.ts.md'.length,
    );
    const chunk = specifier.slice(markerIndex + marker.length);
    if (!documentSpecifier || !chunk) return;
    return {
      absPath: path.resolve(path.dirname(base), documentSpecifier),
      chunk,
    };
  }

  if (specifier.endsWith('.ts.md')) {
    return {
      absPath: path.resolve(path.dirname(base), specifier),
      chunk: 'main',
    };
  }

  return undefined;
}
```

## 公開インタフェース

```ts main
export { cleanImporter } from ':cleanImporter';
export { resolveImport } from ':resolveImport';
export type { ResolvedTsMdImport } from ':resolveImport';

if (import.meta.vitest) {
  await import(':resolveImport.test');
}
```

## Tests

```ts resolveImport.test
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVirtualModuleFileName } from './module-id.ts.md';
import { resolveImport } from ':resolveImport';

describe('resolveImport', () => {
  it('resolves a document import to its main module', () => {
    expect(resolveImport('./foo.ts.md', '/a/b/main.ts.md')).toEqual({
      absPath: path.resolve('/a/b/foo.ts.md'),
      chunk: 'main',
    });
  });

  it('resolves a module in the same document', () => {
    expect(resolveImport(':qux', '/a/b/doc.ts.md')).toEqual({
      absPath: path.resolve('/a/b/doc.ts.md'),
      chunk: 'qux',
    });
  });

  it('resolves a named module in another document', () => {
    expect(resolveImport('../foo.ts.md:qux', '/a/b/c/app.ts.md')).toEqual({
      absPath: path.resolve('/a/b/foo.ts.md'),
      chunk: 'qux',
    });
  });

  it('uses the source document when importer is a virtual module', () => {
    const importer = createVirtualModuleFileName({
      documentPath: '/a/b/doc.ts.md',
      moduleName: 'main',
    });
    expect(resolveImport(':qux', importer)).toEqual({
      absPath: path.resolve('/a/b/doc.ts.md'),
      chunk: 'qux',
    });
  });

  it('does not support the legacy hash shorthand', () => {
    expect(resolveImport('#qux', '/a/b/doc.ts.md')).toBeUndefined();
  });
});
```
