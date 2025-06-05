import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { tangle } from '../src/tangle';

describe('tangle', () => {
  it('writes files', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tangle-'));
    const dict = { foo: 'export const a = 1' };
    const out = await tangle(dict, '/doc.ts.md', tmp);
    const file = out[0];
    const content = await fs.readFile(file, 'utf8');
    expect(content.trim()).toBe('export const a = 1');
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
