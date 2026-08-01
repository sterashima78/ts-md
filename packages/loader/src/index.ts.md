# Loader

`.ts.md` document 内の各コードフェンスを、独立した Node.js ESM module としてロードします。

## 型定義

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

## resolve

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

## load

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

## 公開インタフェース

```ts main
export { load } from ':load';
export { resolve } from ':resolve';

if (import.meta.vitest) {
  await import(':loader.test');
}
```

## Tests

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
