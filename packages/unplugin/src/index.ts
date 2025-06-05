import fs from 'node:fs/promises';
import { createFilter } from '@rollup/pluginutils';
import { parseChunks, resolveImport } from '@sterashima78/ts-md-core';
import { createUnplugin } from 'unplugin';

export interface Options {
  include?: RegExp;
}

export const unplugin = createUnplugin(
  ({ include = /\.ts\.md$/ }: Options | undefined = {}) => {
    const filter = createFilter(include);
    const cache = new Map<string, Record<string, string>>();

    return {
      name: 'ts-md',
      enforce: 'pre',
      resolveId(id, importer) {
        if (!id.startsWith('#') || !importer) return;
          const info = resolveImport(id, importer);
          if (!info) return;
          const absPath = info.absPath;
          const chunk = info.chunk;
        return `\0ts-md:${absPath}?c=${chunk}`;
      },
      async load(id) {
        if (!filter(id)) {
          if (id.startsWith('\0ts-md:')) {
            const m = id.match(/^\0ts-md:(.+?)\?c=(.+)$/);
            if (!m) return;
            const [, abs, chunk] = m;
            const dict = cache.get(abs) ?? (await parseFile(abs));
            return dict[chunk];
          }
          return;
        }
        const dict = await parseFile(id);
        return Object.keys(dict)
          .filter((c) => /^(main|index)$/.test(c))
          .map((c) => `import '#${id}:${c}'`)
          .join('\n');
      },
      async watchChange(id) {
        if (filter(id)) await parseFile(id, true);
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
  },
);

export default unplugin;
