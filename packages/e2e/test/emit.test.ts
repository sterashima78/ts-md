import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const fixture = path.join(__dirname, 'fixtures', 'cross-dep.ts.md');
const pkgRoot = path.join(__dirname, '..');

describe('emit command e2e', () => {
  it('writes declaration files via CLI', async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'emit-e2e-'));
    execSync(`pnpm exec tsmd emit ${fixture} -o ${outDir}`, { cwd: pkgRoot });
    const dts = await fs.readFile(
      path.join(outDir, 'cross-dep', 'foo.d.ts'),
      'utf8',
    );
    expect(dts.trim()).toBe('export declare const val = "cross value";');
  });
});
