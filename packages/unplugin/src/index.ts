import fs from 'node:fs/promises';
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
      if (!(id.includes('.ts.md:') || id.startsWith(':')) || !importer) return;
      const info = resolveImport(id, importer);
      if (!info) return;
      const absPath = info.absPath;
      const chunk = info.chunk;
      return `${absPath}?block=${chunk}&lang.ts`;
    },
    async load(id) {
      const [file, query] = id.split('?', 2);
      if (!filter(file)) return;

      const params = new URLSearchParams(query);
      const block = params.get('block');

      if (block) {
        const dict = cache.get(file) ?? (await parseFile(file));
        return dict[block];
      }

      const dict = await parseFile(file);
      return Object.keys(dict)
        .map((c) => `export * from '${file}?block=${c}&lang.ts'`)
        .join('\n');
    },
    async watchChange(id) {
      const file = id.split('?')[0];
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
