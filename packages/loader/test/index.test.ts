import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('ts-md-loader', () => {
  const dir = path.join(__dirname, 'fixtures');
  const md = path.join(dir, 'doc.ts.md');
  const loaderSrc = path.join(__dirname, '..', 'dist', 'index.js');
  const builtLoader = path.join(dir, 'loader.mjs');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      md,
      [
        '# Doc',
        '',
        '```ts foo',
        "export const msg = 'loader works'",
        '```',
        '',
        '```ts main',
        'import { msg } from "#foo"',
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
    const source = fs.readFileSync(loaderSrc, 'utf8');
    const loaderCode = source;
    fs.writeFileSync(builtLoader, loaderCode);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('runs markdown file', () => {
    const out = execSync(`node --loader ${builtLoader} ${md}`, {
      encoding: 'utf8',
    });
    expect(out.trim()).toBe('loader works');
  });
});
