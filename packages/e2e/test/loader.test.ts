import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const loaderPath = require.resolve('@sterashima78/ts-md-loader');

describe('loader e2e', () => {
  it('runs markdown via Node loader', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loader-e2e-'));
    const md = path.join(dir, 'doc.ts.md');
    fs.writeFileSync(
      md,
      [
        '# Doc',
        '',
        '```ts foo',
        "export const msg = 'loader e2e success'",
        '```',
        '',
        '```ts main',
        'import { msg } from "#foo"',
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
    const out = execSync(`node --loader ${loaderPath} ${md}`, {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(out.trim()).toBe('loader e2e success');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
