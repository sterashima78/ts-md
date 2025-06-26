import { promises as fs } from 'node:fs';
import { dirname, join, normalize, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader } from 'astro/loaders';
import fg from 'fast-glob';

export function packagesLoader(): Loader {
  const root = new URL('../../..', import.meta.url);
  const pattern =
    'packages/{cli,core,loader,ls-core,unplugin}/{README.md,src/**/*.ts.md}';

  return {
    name: 'packages-loader',
    async load(ctx) {
      const cwd = fileURLToPath(root);
      const files = await fg(pattern, { cwd });
      for (const entry of files) {
        const absPath = join(cwd, entry);
        let body = await fs.readFile(absPath, 'utf8');
        body = rewriteLinks(body, entry);
        let title: string | undefined;
        const heading = body.match(/^#\s+(.+?)(?:\r?\n|$)/);
        if (heading) {
          title = heading[1].trim();
          body = body.slice(heading[0].length).replace(/^\n+/, '');
        } else {
          const m = body.match(/^#\s+(.*)/m);
          title = m ? m[1].trim() : undefined;
        }
        const match = entry.match(/^packages\/([^/]+)\/src\/(.*)\.ts\.md$/);
        const readmeMatch = entry.match(/^packages\/([^/]+)\/README\.md$/);
        const id = match
          ? `packages/${match[1]}/${match[2]}`
          : readmeMatch
            ? `packages/${readmeMatch[1]}/README`
            : entry.replace(/\.ts\.md$/, '').replace(/\.md$/, '');
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

function rewriteLinks(md: string, entry: string): string {
  return md.replace(/\(([^)]+\.ts\.md)\)/g, (full, link) => {
    const abs = normalize(posix.join(dirname(entry), link));
    const m = abs.match(/^packages\/([^/]+)\/src\/(.*)\.ts\.md$/);
    if (!m) return full;
    const slug = `/ts-md/packages/${m[1]}/${m[2]}/`;
    return `(${slug})`;
  });
}
