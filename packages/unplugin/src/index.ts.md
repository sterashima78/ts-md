# Adapting TS-MD to bundlers

Vite、Rollup、Rolldown、Webpack、esbuild は plugin API が異なりますが、TS-MD に必要な処理は共通です。specifier を仮想 module ID へ変換し、その ID が指す code fence の source を返します。

この document では bundler 固有の adapter を `unplugin` に任せ、TS-MD の処理を三つの段階にそろえます。

1. document を読み、解析結果を cache する
2. import を共通の仮想 module ID へ解決する
3. 仮想 module ID から一つの code fence を load する

## Parsing once per document

一つの document に複数の module があるため、module ごとに Markdown を読み直すのは避けます。cache には code の辞書ではなく `TsMdDocument` 全体を保存し、module identity や language も同じ parser 結果から参照します。

watch event では `force` を使って明示的に再読込します。

```ts parseFile
import fs from 'node:fs/promises';
import {
  parseDocument,
  type TsMdDocument,
} from '@sterashima78/ts-md-core';

export async function parseFile(
  file: string,
  cache: Map<string, TsMdDocument>,
  force = false,
) {
  const cached = cache.get(file);
  if (cached && !force) return cached;
  const markdown = await fs.readFile(file, 'utf8');
  const document = parseDocument(markdown, file);
  cache.set(file, document);
  return document;
}
```

## One plugin lifecycle, one module model

`resolveId` は三種類の入力を同じ仮想 ID へ集約します。すでに仮想 ID ならそのまま返し、`.ts.md` document の直接 import は `main` へ、その他の TS-MD specifier は core resolver へ渡します。

`load` は仮想 ID 以外を無視します。対象 document が include filter に合う場合だけ cache から document を取得し、指定 module の code を返します。

`watchChange` は bundler から document path と仮想 module path のどちらが渡っても元 document を特定し、cache を更新します。各 hook が独自の命名規則を持たず、core の module ID と resolver を共有することがこの adapter の中心です。

```ts main
import path from 'node:path';
import { createFilter } from '@rollup/pluginutils';
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
  resolveImport,
  type TsMdDocument,
} from '@sterashima78/ts-md-core';
import { createUnplugin } from 'unplugin';
import { parseFile } from ':parseFile';

export interface Options {
  include?: RegExp;
}

export const unplugin = createUnplugin((options: Options | undefined) => {
  const { include = /\.ts\.md$/ } = options ?? {};
  const filter = createFilter(include);
  const cache = new Map<string, TsMdDocument>();

  return {
    name: 'ts-md',
    enforce: 'pre',

    resolveId(id, importer) {
      if (parseVirtualModuleFileName(id)) return id;

      if (id.endsWith('.ts.md')) {
        const documentPath = importer
          ? path.resolve(path.dirname(importer), id)
          : path.resolve(id);
        return createVirtualModuleFileName({
          documentPath,
          moduleName: 'main',
        });
      }

      if (!importer) return;
      const resolved = resolveImport(id, importer);
      if (!resolved) return;
      return createVirtualModuleFileName({
        documentPath: resolved.absPath,
        moduleName: resolved.chunk,
      });
    },

    async load(id) {
      const moduleId = parseVirtualModuleFileName(id);
      if (!moduleId || !filter(moduleId.documentPath)) return;

      const document = await parseFile(moduleId.documentPath, cache);
      const module = document.modules.find(
        (candidate) => candidate.name === moduleId.moduleName,
      );
      if (!module) {
        throw new Error(
          `module '${moduleId.moduleName}' not found in ${moduleId.documentPath}`,
        );
      }
      return module.code;
    },

    async watchChange(id) {
      const moduleId = parseVirtualModuleFileName(id);
      const documentPath = moduleId?.documentPath ?? id;
      if (filter(documentPath)) {
        await parseFile(documentPath, cache, true);
      }
    },
  };
});

export default unplugin;
```
