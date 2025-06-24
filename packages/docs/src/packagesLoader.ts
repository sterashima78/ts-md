import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader } from 'astro/loaders';
import fg from 'fast-glob';

export function packagesLoader(): Loader {
  const root = new URL('../../..', import.meta.url);
  const tsPattern =
    'packages/{cli,core,loader,ls-core,sandbox,unplugin,monaco,tsc,vscode}/src/**/*.ts.md';
  const readmePattern =
    'packages/{cli,core,loader,ls-core,sandbox,unplugin,monaco,tsc,vscode}/README.md';

  return {
    name: 'packages-loader',
    async load(ctx) {
      const cwd = fileURLToPath(root);
      const files = await fg([tsPattern, readmePattern], { cwd });
      for (const entry of files) {
        const absPath = join(cwd, entry);
        const body = await fs.readFile(absPath, 'utf8');
        const heading = body.match(/^#\s+(.*)/m);
        const title = heading ? heading[1].trim() : undefined;
        let id: string;
        if (entry.endsWith('README.md')) {
          const match = entry.match(/^packages\/([^/]+)\/README.md$/);
          id = match ? `packages/${match[1]}/README` : entry.replace(/\.md$/, '');
        } else {
          const match = entry.match(/^packages\/([^/]+)\/src\/(.*)\.ts\.md$/);
          id = match
            ? `packages/${match[1]}/${match[2]}`
            : entry.replace(/\.ts\.md$/, '');
        }
        const data = await ctx.parseData({
          id,
          data: { title },
          filePath: entry,
        });
        const rendered = await ctx.renderMarkdown(body, {
          fileURL: new URL(entry, ctx.config.root),
        });
        ctx.store.set({
          id,
          data,
          body,
          filePath: entry,
          digest: ctx.generateDigest(body),
          rendered,
        });
      }
    },
  };
}
