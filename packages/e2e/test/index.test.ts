import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const fixture = path.join(__dirname, 'fixtures', 'app.ts.md');
const bad = path.join(__dirname, 'fixtures', 'error.ts.md');

const pkgRoot = path.join(__dirname, '..');

describe('e2e', () => {
  it('tangles markdown to files', async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-'));
    execSync(`pnpm exec tsmd tangle ${fixture} -o ${outDir}`, {
      cwd: pkgRoot,
    });
    const outFile = path.join(outDir, 'app', 'main.ts');
    const code = await fs.readFile(outFile, 'utf8');
    expect(code.trim()).toBe("console.log('e2e success')");
  });

  it('runs markdown via CLI', async () => {
    const tmp = path.join(os.tmpdir(), `run-${Date.now()}.txt`);
    execSync(`pnpm exec tsmd run ${fixture} > ${tmp}`, { cwd: pkgRoot });
    const out = await fs.readFile(tmp, 'utf8');
    expect(out.trim()).toBe('e2e success');
  });

  it('checks markdown via CLI', () => {
    execSync(`pnpm exec tsmd check ${fixture}`, { cwd: pkgRoot });
  }, 20000);

  it('fails to check invalid markdown via CLI', () => {
    try {
      execSync(`pnpm exec tsmd check ${bad}`, {
        cwd: pkgRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      throw new Error('expected failure');
    } catch (err) {
      const e = err as { stderr: string };
      expect(e.stderr).toMatch(
        "Type 'number' is not assignable to type 'string'",
      );
    }
  }, 20000);
});
