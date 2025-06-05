import path from 'node:path';

export function resolveImport(
  specifier: string,
  importer: string,
): { absPath: string; chunk: string } | undefined {
  const m = /^#([^:]+):(.+)$/.exec(specifier);
  if (!m) return undefined;
  const [, rel, chunk] = m;
  const absPath = path.resolve(path.dirname(importer), rel);
  return { absPath, chunk };
}
