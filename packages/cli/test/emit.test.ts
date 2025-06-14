import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runEmit } from '../src/commands/emit';

describe('emit', () => {
  it('writes declaration files', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'emit-'));
    const file = path.join(tmp, 'doc.ts.md');
    const md = ['```ts foo', 'export const x: number = 1', '```'].join('\n');
    await fs.writeFile(file, md);
    const out = path.join(tmp, 'out');
    await runEmit([file], out);
    const dts = await fs.readFile(path.join(out, 'doc', 'foo.d.ts'), 'utf8');
    expect(dts.trim()).toBe('export declare const x: number;');
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
