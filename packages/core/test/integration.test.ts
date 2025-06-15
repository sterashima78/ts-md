import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseChunks } from '../src/parser';
import { resolveImport } from '../src/resolver';
import { tangle } from '../src/tangle';

const md = ['```ts main', "import './dep.ts.md:dep'", '```'].join('\n');

const depMd = ['```ts dep', 'export const msg = 1', '```'].join('\n');

describe('integration', () => {
  it('roundtrip', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'int-'));
    const dict = parseChunks(md, path.join(tmp, 'doc.ts.md'));
    const depDict = parseChunks(depMd, path.join(tmp, 'dep.ts.md'));
    const all = { ...dict, ...depDict };
    await tangle(all, path.join(tmp, 'doc.ts.md'), tmp);
    const r = resolveImport('./dep.ts.md:dep', path.join(tmp, 'doc.ts.md'));
    const file = r?.absPath;
    const content = await fs.readFile(
      path.join(tmp, 'doc.ts', 'dep.ts'),
      'utf8',
    );
    expect(file).toBe(path.join(tmp, 'dep.ts.md'));
    expect(content.trim()).toBe('export const msg = 1');
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
