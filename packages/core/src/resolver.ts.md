# Resolving TS-MD imports

TS-MD では、一つの Markdown document の中に複数の TypeScript module が存在します。通常の module resolver が扱う path に加えて、どの module を指すかも解決しなければなりません。

この文書は import を二つの形に限定します。

- `:module` は同じ document の名前付き module
- `./other.ts.md` は別 document の `main` module

別 document の名前付き module を `./other.ts.md:module` のように参照することはできません。`main` 以外の module は、その module を定義した document の内部でのみ参照できます。

npm package や通常の TypeScript import はここでは解決せず、呼び出し元の既定 resolver に残します。

## Recovering the source document

resolver の `importer` には、元の `.ts.md` path、`file:` URL、または TS-MD の仮想 module path が渡されます。最初にそれらを元 document の path へ戻しておくと、後続の分岐は同じ基準で相対 path を計算できます。

query は bundler が付加することがあるため除去します。変換できない `file:` URL は resolver 全体を失敗させず、そのまま返して既定処理へ委ねられる形にします。

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

## Interpreting the two supported forms

解決結果は document の絶対 path と module 名に正規化します。この形は loader、bundler、language service のすべてで共有され、各 adapter は必要に応じて仮想ファイル名へ変換します。

同一 document の `:module` では importer 自体が document path です。別 document の場合は importer のディレクトリを基準に path を解決し、常に `main` module を返します。空の module 名や別 document に対する module suffix は TS-MD import として受理しません。

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

  if (specifier.endsWith('.ts.md')) {
    return {
      absPath: path.resolve(path.dirname(base), specifier),
      chunk: 'main',
    };
  }

  return undefined;
}
```

## Public boundary

`cleanImporter` は adapter が importer の正規化だけを必要とする場合にも使えるため公開します。テストは public module から遅延 import し、本番 bundle には含めません。

```ts main
export { cleanImporter } from ':cleanImporter';
export { resolveImport } from ':resolveImport';
export type { ResolvedTsMdImport } from ':resolveImport';

if (import.meta.vitest) {
  await import(':resolveImport.test');
}
```

## Executable examples

テストは二つの import 形式と、仮想 module から元 document へ戻る経路を固定します。別 document の module suffix と、以前の `#module` shorthand を受理しないことも仕様として残します。

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

  it('does not resolve module suffixes on another document', () => {
    expect(
      resolveImport('../foo.ts.md:qux', '/a/b/c/app.ts.md'),
    ).toBeUndefined();
    expect(
      resolveImport('../foo.ts.md:main', '/a/b/c/app.ts.md'),
    ).toBeUndefined();
  });

  it('does not support the legacy hash shorthand', () => {
    expect(resolveImport('#qux', '/a/b/doc.ts.md')).toBeUndefined();
  });
});
```
