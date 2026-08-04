# Loading TS-MD in Node.js

Node.js の loader hook は、module specifier を URL へ変える `resolve` と、URL から実行する source を返す `load` の二段階で動きます。

TS-MD loader もこの境界に合わせます。`resolve` は document と module 名を共通の仮想 file name へ変換し、`load` はその identity を元に Markdown から一つの code fence を取り出して JavaScript へ変換します。

この分担により、同一 document 内の named module import、別 document の `main` module import、`.ts.md` document を直接 entry にした場合を、すべて同じ仮想 module の経路へ集約できます。別 document の named module は import として解決しません。

## Loader hook contracts

Node.js の型に直接依存せず、この実装が利用する hook の最小形だけを定義します。既定 hook を引数として受け取るため、TS-MD が扱わない import は Node.js の通常処理へ戻せます。

```ts types
export type Resolve = (
  specifier: string,
  context: { parentURL?: string },
  defaultResolve: Resolve,
) => Promise<{
  url: string;
  format?: string;
  shortCircuit?: boolean;
}>;

export type Load = (
  url: string,
  context: { format?: string },
  defaultLoad: Load,
) => Promise<{
  format: string;
  source: string;
  shortCircuit?: boolean;
}>;
```

## Resolving every TS-MD form to one identity

最初に、すでに仮想 module となっている specifier はそのまま受理します。次に parent URL を元 document へ戻し、core の `resolveImport` で同一 document の `:module` と別 document の `.ts.md` import を解釈します。

最後に、document 自体が entry point として渡された場合は `main` module の仮想 file name を作ります。いずれにも当てはまらない import は `defaultResolve` に委譲します。

`getParentDocument` は仮想 module と通常の `file:` URL の差を hook 本体から隠し、相対 import の基準を常に元 document にそろえます。

```ts resolve
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
  resolveImport,
} from '@sterashima78/ts-md-core';
import type { Resolve } from ':types';

function getParentDocument(parentURL: string | undefined): string | undefined {
  if (!parentURL) return;
  const virtualModule = parseVirtualModuleFileName(parentURL);
  if (virtualModule) return virtualModule.documentPath;
  if (!parentURL.startsWith('file:')) return;
  return fileURLToPath(parentURL);
}

export const resolve: Resolve = async (specifier, context, defaultResolve) => {
  if (parseVirtualModuleFileName(specifier)) {
    return {
      url: specifier.startsWith('file:')
        ? specifier
        : pathToFileURL(specifier).href,
      format: 'module',
      shortCircuit: true,
    };
  }

  const parentDocument = getParentDocument(context.parentURL);
  if (parentDocument) {
    const resolved = resolveImport(specifier, parentDocument);
    if (resolved) {
      return {
        url: pathToFileURL(
          createVirtualModuleFileName({
            documentPath: resolved.absPath,
            moduleName: resolved.chunk,
          }),
        ).href,
        format: 'module',
        shortCircuit: true,
      };
    }
  }

  const fileSpecifier = specifier.startsWith('file:')
    ? fileURLToPath(specifier)
    : specifier;
  if (fileSpecifier.endsWith('.ts.md')) {
    const documentPath = parentDocument
      ? path.resolve(path.dirname(parentDocument), fileSpecifier)
      : path.resolve(fileSpecifier);
    return {
      url: pathToFileURL(
        createVirtualModuleFileName({
          documentPath,
          moduleName: 'main',
        }),
      ).href,
      format: 'module',
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
};
```

## Materializing one code fence

`load` が受け取る URL を仮想 module identity に戻し、対象 document を parser へ渡します。module が見つからない場合は、空 source を返さず identity と document path を含む明確な error にします。

TypeScript の構文除去と TSX 変換には `transpileModule` を使います。型検査は loader の責務ではなく、`ts-md-tsc` や language service が担います。ここでは Node.js が実行できる ESM source を返すことだけに集中します。

```ts load
import fs from 'node:fs';
import {
  parseDocument,
  parseVirtualModuleFileName,
} from '@sterashima78/ts-md-core';
import ts from 'typescript';
import type { Load } from ':types';

export const load: Load = async (url, context, defaultLoad) => {
  const moduleId = parseVirtualModuleFileName(url);
  if (!moduleId) return defaultLoad(url, context, defaultLoad);

  const markdown = fs.readFileSync(moduleId.documentPath, 'utf8');
  const document = parseDocument(markdown, moduleId.documentPath);
  const module = document.modules.find(
    (candidate) => candidate.name === moduleId.moduleName,
  );
  if (!module) {
    throw new Error(
      `module '${moduleId.moduleName}' not found in ${moduleId.documentPath}`,
    );
  }

  const result = ts.transpileModule(module.code, {
    fileName: `${module.name}.${module.language}`,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      sourceMap: false,
    },
  });
  return {
    format: 'module',
    source: result.outputText,
    shortCircuit: true,
  };
};
```

## Public hook module

Node.js が参照する `main` module から二つの hook を公開します。テストは Vitest 実行時だけ同一 document の named module として読み込みます。

```ts main
export { load } from ':load';
export { resolve } from ':resolve';

if (import.meta.vitest) {
  await import(':loader.test');
}
```

## Testing the complete loader boundary

unit test だけでは hook の接続方法を検証できないため、fixture document と built loader を使って実際の Node.js process を起動します。

最初の例は document を直接 entry にして `main` が実行されることを確認します。二つ目は named module の仮想 file name を entry にできることを確認します。仮想 file name は tool 内部の identity であり、別 document からの import specifier ではありません。

```ts loader.test
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createVirtualModuleFileName } from '@sterashima78/ts-md-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('ts-md-loader', () => {
  const dir = path.join(process.cwd(), 'test', 'fixtures');
  const markdownFile = path.join(dir, 'doc.ts.md');
  const loaderSource = path.join(process.cwd(), 'dist', 'index.js');
  const builtLoader = path.join(dir, 'loader.mjs');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      markdownFile,
      [
        '# Doc',
        '',
        '```ts foo',
        "export const msg = 'loader works'",
        '```',
        '',
        '```ts main',
        'import { msg } from ":foo"',
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
    fs.writeFileSync(builtLoader, fs.readFileSync(loaderSource, 'utf8'));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('runs the main module from a markdown document', () => {
    const output = execSync(
      `node --loader ${builtLoader} ${markdownFile}`,
      { encoding: 'utf8' },
    );
    expect(output.trim()).toBe('loader works');
  });

  it('runs a named virtual module as an entry', () => {
    const entry = createVirtualModuleFileName({
      documentPath: markdownFile,
      moduleName: 'foo',
    });
    const output = execSync(`node --loader ${builtLoader} ${entry}`, {
      encoding: 'utf8',
    });
    expect(output.trim()).toBe('');
  });
});
```
