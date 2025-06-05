import fs from 'node:fs/promises';
import path from 'node:path';
import type { ChunkDict } from './parser';
import { escapeChunk } from './utils';

export async function tangle(
  dict: ChunkDict,
  baseFile: string,
  outDir: string,
  rename?: (chunk: string) => string,
): Promise<string[]> {
  const baseName = path.basename(baseFile, path.extname(baseFile));
  const baseOut = path.join(outDir, baseName);
  await fs.mkdir(baseOut, { recursive: true });
  const written: string[] = [];

  for (const [chunk, code] of Object.entries(dict)) {
    const rel = rename ? rename(chunk) : `${escapeChunk(chunk)}.ts`;
    const filePath = path.join(baseOut, rel);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, code, 'utf8');
    written.push(filePath);
  }

  return written;
}
