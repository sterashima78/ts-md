import { glob, readFile } from 'node:fs/promises';
import { dirname, join, normalize, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader } from 'astro/loaders';

const TS_MD_SOURCE_PATTERN = 'packages/*/src/**/*.ts.md';
const PACKAGE_README_PATTERN = 'packages/*/README.md';
const PACKAGE_ENTRY_PATTERN = /^packages\/([^/]+)\//;
const PACKAGE_FIXTURE_PATTERN = /^packages\/[^/]+\/src\/fixtures\//;
const MODULE_INFO_PATTERN = /^(ts|tsx)\s+([a-zA-Z0-9._-]+)$/;

export function packagesLoader(): Loader {
  const root = new URL('../../..', import.meta.url);

  return {
    name: 'packages-loader',
    async load(ctx) {
      const cwd = fileURLToPath(root);
      const sourceEntries = await Array.fromAsync(
        glob(TS_MD_SOURCE_PATTERN, { cwd }),
      );
      const readmeEntries = await Array.fromAsync(
        glob(PACKAGE_README_PATTERN, { cwd }),
      );
      const files = selectPackageDocumentEntries(sourceEntries, readmeEntries);

      for (const entry of files) {
        const absPath = join(cwd, entry);
        let body = await readFile(absPath, 'utf8');
        body = rewriteLinks(body, entry);
        body = addModuleTitles(body);
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

export function selectPackageDocumentEntries(
  sourceEntries: readonly string[],
  readmeEntries: readonly string[],
): string[] {
  const implementationEntries = sourceEntries.filter(
    (entry) => !PACKAGE_FIXTURE_PATTERN.test(entry),
  );
  const packageNames = new Set<string>();
  for (const entry of implementationEntries) {
    const packageName = entry.match(PACKAGE_ENTRY_PATTERN)?.[1];
    if (packageName) packageNames.add(packageName);
  }

  return [
    ...implementationEntries,
    ...readmeEntries.filter((entry) => {
      const packageName = entry.match(PACKAGE_ENTRY_PATTERN)?.[1];
      return packageName !== undefined && packageNames.has(packageName);
    }),
  ].sort();
}

export function addModuleTitles(markdown: string): string {
  let openFence: { marker: string; length: number } | undefined;

  return markdown.replace(/^.*$/gm, (line) => {
    const match = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (!match) return line;

    const indentation = match[1] ?? '';
    const fence = match[2];
    const rawInfo = match[3] ?? '';
    if (!fence) return line;

    if (openFence) {
      if (
        fence.charAt(0) === openFence.marker &&
        fence.length >= openFence.length &&
        rawInfo.trim() === ''
      ) {
        openFence = undefined;
      }
      return line;
    }

    openFence = { marker: fence.charAt(0), length: fence.length };
    const moduleInfo = rawInfo.trim().match(MODULE_INFO_PATTERN);
    const language = moduleInfo?.[1];
    const moduleName = moduleInfo?.[2];
    if (!language || !moduleName) return line;

    return `${indentation}${fence}${language} title="${moduleName}"`;
  });
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
