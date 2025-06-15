import path from 'node:path';

export function resolveImport(
  specifier: string,
  importer: string,
): { absPath: string; chunk: string } | undefined {
  if (!(specifier.includes('.ts.md:') || specifier.startsWith(':'))) {
    return undefined;
  }
  const idx = specifier.lastIndexOf(':');
  if (idx === -1) return undefined;
  const rel = specifier.slice(0, idx);
  const chunk = specifier.slice(idx + 1);
  if (!chunk) return undefined;
  const cleanImporter = importer.replace(/^\0?ts-md:/, '').replace(/\?.*$/, '');
  const absPath = rel
    ? path.resolve(path.dirname(cleanImporter), rel)
    : cleanImporter;
  return { absPath, chunk };
}
