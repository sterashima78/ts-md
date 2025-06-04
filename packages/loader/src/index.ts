import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChunks, resolveImport } from '../../core/src/index.js';

export async function resolve(
  specifier: string,
  context: { parentURL?: string },
  defaultResolve: (
    specifier: string,
    context: { parentURL?: string },
  ) => Promise<{ url: string }>,
) {
  if (specifier.startsWith('#')) {
    const importer = context.parentURL
      ? fileURLToPath(context.parentURL)
      : process.cwd();
    const info = resolveImport(specifier, importer);
    if (info) {
      const md = fs.readFileSync(info.file, 'utf8');
      const chunk = parseChunks(md, info.file)[info.name];
      if (!chunk) {
        throw new Error(`chunk ${info.name} not found in ${info.file}`);
      }
      const encoded = Buffer.from(chunk.code, 'utf8').toString('base64');
      return {
        url: `data:text/typescript;base64,${encoded}`,
        shortCircuit: true,
      };
    }
  }
  return defaultResolve(specifier, context);
}

export async function load(
  url: string,
  context: { format?: string },
  defaultLoad: (
    url: string,
    context: { format?: string },
  ) => Promise<{ format: string; source: string }>,
) {
  if (url.startsWith('file:') && url.endsWith('.ts.md')) {
    const file = fileURLToPath(url);
    const md = fs.readFileSync(file, 'utf8');
    const chunks = parseChunks(md, file);
    const main = chunks.main ?? Object.values(chunks)[0];
    if (!main) {
      return { format: 'module', source: '', shortCircuit: true };
    }
    return { format: 'module', source: main.code, shortCircuit: true };
  }
  return defaultLoad(url, context);
}
