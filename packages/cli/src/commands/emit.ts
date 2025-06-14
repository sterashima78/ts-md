import fs from 'node:fs/promises';
import { emitDeclarations } from '@sterashima78/ts-md-ls-core';
import pc from 'picocolors';
import { expandGlobs } from '../utils/globs';

export async function runEmit(globs: string[], outDir = 'dist') {
  const files = await expandGlobs(globs);
  if (!files.length) return console.log(pc.yellow('No .ts.md files found.'));
  await fs.mkdir(outDir, { recursive: true });
  const outFiles = await emitDeclarations(files, outDir);
  for (const f of outFiles) {
    console.log(`✨ wrote ${f}`);
  }
}
