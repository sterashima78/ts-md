import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseChunks } from '../src/parser.ts.md';
import { resolveImport } from '../src/resolver.ts.md';
import { tangle } from '../src/tangle.ts.md';

describe('integration', () => {
  it('roundtrip', async () => {
    const md = [
      '`' + '`' + '`' + 'ts main',
      "import './dep.ts.md'",
      '`' + '`' + '`',
    ].join('\n');

    const depMd = [
      '`' + '`' + '`' + 'ts main',
      'export const msg = 1',
      '`' + '`' + '`',
    ].join('\n');
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'int-'));
    const dict = parseChunks(md, path.join(tmp, 'doc.ts.md'));
    const depDict = parseChunks(depMd, path.join(tmp, 'dep.ts.md'));
    await tangle(dict, path.join(tmp, 'doc.ts.md'), tmp);
    await tangle(depDict, path.join(tmp, 'dep.ts.md'), tmp);
    const r = resolveImport('./dep.ts.md', path.join(tmp, 'doc.ts.md'));
    const file = r?.absPath;
    const content = await fs.readFile(
      path.join(tmp, 'dep.ts', 'main.ts'),
      'utf8',
    );
    expect(file).toBe(path.join(tmp, 'dep.ts.md'));
    expect(content.trim()).toBe('export const msg = 1');
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
