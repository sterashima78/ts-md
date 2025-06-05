import fs from 'node:fs/promises';
import path from 'node:path';
import { parseChunks } from '@sterashima78/ts-md-core';
import { expandGlobs } from '../utils/globs';

export async function runTangle(inputGlobs: string[], outDir = 'dist') {
  const files = await expandGlobs(inputGlobs);
  await fs.mkdir(outDir, { recursive: true });

  for (const file of files) {
    const md = await fs.readFile(file, 'utf8');
    const dict = parseChunks(md, file);

    for (const [chunk, info] of Object.entries(dict)) {
      const rel = path.join(path.basename(file, '.ts.md'), `${chunk}.ts`);
      const target = path.join(outDir, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, info.code, 'utf8');
      console.log(`✨ wrote ${target}`);
    }
  }
}
