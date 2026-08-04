import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createVirtualModuleFileName } from '@sterashima78/ts-md-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('ts-md-loader', () => {
  const dir = path.join(process.cwd(), 'test', 'fixtures');
  const markdownFile = path.join(dir, 'doc.ts.md');
  const loaderSource = path.join(process.cwd(), 'dist', 'index.js');
  const builtLoader = path.join(dir, 'loader.mjs');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      markdownFile,
      [
        '# Doc',
        '',
        '```ts foo',
        "export const msg = 'loader works'",
        '```',
        '',
        '```ts main',
        'import { msg } from ":foo"',
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
    fs.writeFileSync(builtLoader, fs.readFileSync(loaderSource, 'utf8'));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('Markdown document の main module を実行する', () => {
    const output = execSync(`node --loader ${builtLoader} ${markdownFile}`, {
      encoding: 'utf8',
    });
    expect(output.trim()).toBe('loader works');
  });

  it('内部の名前付き仮想 module を entry として実行する', () => {
    const entry = createVirtualModuleFileName({
      documentPath: markdownFile,
      moduleName: 'foo',
    });
    const output = execSync(`node --loader ${builtLoader} ${entry}`, {
      encoding: 'utf8',
    });
    expect(output.trim()).toBe('');
  });
});
