import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const fixture = path.join(__dirname, 'fixtures', 'tsc');
const tsconfig = path.join(fixture, 'tsconfig.json');

async function runTsc() {
  execSync(`pnpm exec ts-md-tsc -p ${tsconfig} --emitDeclarationOnly`, {
    cwd: fixture,
    stdio: 'inherit',
  });
}

describe('ts-md-tsc', () => {
  it('generates dts for mixed refs', async () => {
    await runTsc();
    const out = await fs.readFile(
      path.join(fixture, 'dist', 'dep.ts.md.d.ts'),
      'utf8',
    );
    expect(out).toMatchSnapshot();
  });
});
