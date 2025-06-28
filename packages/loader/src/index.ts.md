# Loader

`.ts.md` を Node.js で読み込むための ESM ローダーです。

## 型定義

共通で利用する型を定義します。

```ts types
export type Resolve = (
  specifier: string,
  context: { parentURL?: string | undefined },
  defaultResolve: Resolve,
) => Promise<{ url: string }>;

export type Load = (
  url: string,
  context: { format?: string | undefined },
  defaultLoad: Load,
) => Promise<{ format: string; source: string }>;

const VIRTUAL_PREFIX = 'ts-md:';
```

## `resolve` 関数

モジュールのパス解決を担当します。`.ts.md` の場合はチャンク名を含む仮想 URL を返します。

```ts resolve
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveImport } from '@sterashima78/ts-md-core';

export type Resolve = (
  specifier: string,
  context: { parentURL?: string | undefined },
  defaultResolve: Resolve,
) => Promise<{ url: string }>;

const VIRTUAL_PREFIX = 'ts-md:';

export const resolve: Resolve = async (specifier, context, defaultResolve) => {
  let parentURL: string | undefined;
  if (context.parentURL) {
    if (context.parentURL.startsWith(VIRTUAL_PREFIX)) {
      const body = context.parentURL.slice(VIRTUAL_PREFIX.length);
      const m = /(.*\.ts\.md)__(.+)\.ts$/.exec(body);
      parentURL = m ? m[1] : body;
    } else {
      parentURL = fileURLToPath(context.parentURL);
    }
  }
  const specPath = specifier.startsWith('file:')
    ? fileURLToPath(specifier)
    : specifier;
  if (parentURL) {
    const info = resolveImport(specifier, parentURL);
    if (info) {
      const abs = path.resolve(info.absPath);
      const url = `${VIRTUAL_PREFIX}${abs}__${info.chunk}.ts`;
      return { url, format: 'module', shortCircuit: true };
    }
  }

  if (specPath.endsWith('.ts.md')) {
    const abs = parentURL
      ? path.resolve(path.dirname(parentURL), specPath)
      : path.resolve(specPath);
    return {
      url: `${VIRTUAL_PREFIX}${abs}__main.ts`,
      format: 'module',
      shortCircuit: true,
    };
  }

  if (specPath.endsWith('.ts')) {
    const abs = parentURL
      ? path.resolve(path.dirname(parentURL), specPath)
      : path.resolve(specPath);
    return {
      url: pathToFileURL(abs).href,
      format: 'module',
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
};
```

## `load` 関数

仮想 URL からコードを読み込み、TypeScript をトランスパイルします。

```ts load
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChunks } from '@sterashima78/ts-md-core';
import ts from 'typescript';

export type Load = (
  url: string,
  context: { format?: string | undefined },
  defaultLoad: Load,
) => Promise<{ format: string; source: string }>;

const VIRTUAL_PREFIX = 'ts-md:';

export const load: Load = async (url, context, defaultLoad) => {
  if (url.startsWith(VIRTUAL_PREFIX)) {
    const body = url.slice(VIRTUAL_PREFIX.length);
    const m = /(.*\.ts\.md)__(.+)\.ts$/.exec(body);
    if (!m) return defaultLoad(url, context, defaultLoad);
    const [, file, name] = m;
    const md = fs.readFileSync(file, 'utf8');
    const chunks = parseChunks(md, file);
    const chunk = chunks[name];
    if (!chunk) {
      throw new Error(`chunk '${name}' not found in ${file}`);
    }
    const tsResult = ts.transpileModule(chunk, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        sourceMap: false,
      },
    });
    return {
      format: 'module',
      source: tsResult.outputText,
      shortCircuit: true,
    };
  }

  if (url.startsWith('file:') && url.endsWith('.ts')) {
    const file = fileURLToPath(url);
    const source = fs.readFileSync(file, 'utf8');
    const tsResult = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        sourceMap: false,
      },
    });
    return {
      format: 'module',
      source: tsResult.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
};
```

## 公開インタフェース

```ts main
export { resolve } from ':resolve';
export { load } from ':load';

if (import.meta.vitest) {
  await import(':loader.test');
}
```

## Tests

```ts loader.test
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('ts-md-loader', () => {
  const dir = path.join(process.cwd(), 'test', 'fixtures');
  const md = path.join(dir, 'doc.ts.md');
  const loaderSrc = path.join(process.cwd(), 'dist', 'index.js');
  const builtLoader = path.join(dir, 'loader.mjs');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      md,
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
    const source = fs.readFileSync(loaderSrc, 'utf8');
    const loaderCode = source;
    fs.writeFileSync(builtLoader, loaderCode);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('runs markdown file', () => {
    const out = execSync(`node --loader ${builtLoader} ${md}`, {
      encoding: 'utf8',
    });
    expect(out.trim()).toBe('loader works');
  });
});
```
