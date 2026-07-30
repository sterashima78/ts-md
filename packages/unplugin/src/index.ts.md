# Unplugin

すべての bundler で、`.ts.md` の各コードフェンスを同じ仮想 TypeScript module として扱います。

## parseFile

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

## plugin

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
