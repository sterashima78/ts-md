# Unplugin

`.ts.md` ファイルを処理するための共通ロジックを提供します。

```ts main
import fs from 'node:fs/promises';
import path from 'node:path';
import { createFilter } from '@rollup/pluginutils';
import { parseChunks, resolveImport } from '@sterashima78/ts-md-core';
import { createUnplugin } from 'unplugin';

export interface Options {
  include?: RegExp;
}

export const unplugin = createUnplugin((options: Options | undefined) => {
  const { include = /\.ts\.md$/ } = options ?? {};
  const filter = createFilter(include);
  const cache = new Map<string, Record<string, string>>();

  return {
    name: 'ts-md',
    enforce: 'pre',
    resolveId(id, importer) {
      if (/\.ts\.md__.+\.ts$/.test(id)) return id;
      if (id.endsWith('.ts.md')) {
        const abs = importer ? path.resolve(path.dirname(importer), id) : id;
        return `${abs}__main.ts`;
      }
      if (!(id.includes('.ts.md:') || id.startsWith(':')) || !importer) return;
      const info = resolveImport(id, importer);
      if (!info) return;
      const { absPath, chunk } = info;
      return `${absPath}__${chunk}.ts`;
    },
    async load(id) {
      const chunkMatch = /(.*\.ts\.md)__(.+)\.ts$/.exec(id);
      if (chunkMatch) {
        const [, file, block] = chunkMatch;
        if (!filter(file)) return;
        const dict = cache.get(file) ?? (await parseFile(file));
        return dict[block];
      }
      if (!filter(id)) return;
      const dict = await parseFile(id);
      if (!dict.main) return '';
      return `export * from '${id}__main.ts'`;
    },
    async watchChange(id) {
      const m = /(.*\.ts\.md)__(.+)\.ts$/.exec(id);
      const file = m ? m[1] : id;
      if (filter(file)) await parseFile(file, true);
    },
  };

  async function parseFile(file: string, force = false) {
    const cached = cache.get(file);
    if (cached && !force) return cached;
    const md = await fs.readFile(file, 'utf8');
    const chunks = parseChunks(md, file);
    const dict: Record<string, string> = {};
    for (const [name, chunk] of Object.entries(chunks)) {
      dict[name] = chunk;
    }
    cache.set(file, dict);
    return dict;
  }
});

export default unplugin;
```
