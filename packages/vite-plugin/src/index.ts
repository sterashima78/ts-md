import fs from 'node:fs';
import path from 'node:path';
import type { ChunkDictionary } from '@sterashima78/ts-md-core';
import { parseChunks, resolveImport } from '@sterashima78/ts-md-core';
import type { Plugin } from 'vite';

export interface TsMdPluginOptions {
  alias?: Record<string, string>;
}

const VIRTUAL_PREFIX = '\0tsmd:';

function isTestChunk(name: string): boolean {
  return (
    name === 'test' ||
    name === 'spec' ||
    /\.test$/.test(name) ||
    /\.spec$/.test(name)
  );
}

export function tsMdPlugin(opts: TsMdPluginOptions = {}): Plugin {
  const cache = new Map<string, ChunkDictionary>();
  const alias = opts.alias || {};

  const applyAlias = (id: string) => {
    for (const [from, to] of Object.entries(alias)) {
      if (id.startsWith(from)) {
        return path.join(to, id.slice(from.length));
      }
    }
    return id;
  };

  const ensureChunks = (file: string) => {
    const abs = path.resolve(applyAlias(file));
    let chunks = cache.get(abs);
    if (!chunks) {
      const md = fs.readFileSync(abs, 'utf8');
      chunks = parseChunks(md, abs);
      cache.set(abs, chunks);
    }
    return { abs, chunks } as { abs: string; chunks: ChunkDictionary };
  };

  return {
    name: 'ts-md-vite-plugin',
    enforce: 'pre',

    resolveId(id, importer) {
      if (id.startsWith('#') && importer) {
        const info = resolveImport(id, importer);
        if (!info) return null;
        const isTest = isTestChunk(info.name);
        const { abs } = ensureChunks(info.file);
        const suffix = isTest ? '.test.ts' : '.ts';
        return `${VIRTUAL_PREFIX}${abs}:${info.name}${suffix}`;
      }
      return null;
    },

    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        let body = id.slice(VIRTUAL_PREFIX.length);
        body = body.replace(/(\.test\.ts|\.ts)$/i, '');
        const idx = body.lastIndexOf(':');
        if (idx === -1) return null;
        const file = body.slice(0, idx);
        const name = body.slice(idx + 1);
        const { chunks, abs } = ensureChunks(file);
        const chunk = chunks[name];
        if (!chunk) {
          throw new Error(`chunk '${name}' not found in ${abs}`);
        }
        this.addWatchFile(abs);
        return {
          code: chunk.code,
          map: { mappings: '' },
        };
      }
      return null;
    },

    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.ts.md')) {
        cache.delete(path.resolve(ctx.file));
      }
    },
  };
}
