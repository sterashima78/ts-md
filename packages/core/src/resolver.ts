import path from 'node:path';

export function resolveImport(
  specifier: string,
  importer: string,
): { absPath: string; chunk: string } | undefined {
  if (!specifier.startsWith('#')) return undefined;
  const body = specifier.slice(1);
  if (!body) return undefined;
  const cleanImporter = importer.replace(/^\0?ts-md:/, '').replace(/\?.*$/, '');
  if (body.includes(':')) {
    const idx = body.indexOf(':');
    const rel = body.slice(0, idx);
    const chunk = body.slice(idx + 1);
    if (!rel || !chunk) return undefined;
    const absPath = path.resolve(path.dirname(cleanImporter), rel);
    return { absPath, chunk };
  }
  return { absPath: cleanImporter, chunk: body };
}
