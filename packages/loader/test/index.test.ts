import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import ts from 'typescript';

describe('ts-md-loader', () => {
  const dir = path.join(__dirname, 'fixtures');
  const md = path.join(dir, 'doc.ts.md');
  const loaderSrc = path.join(__dirname, '..', 'src', 'index.ts');
  const builtLoader = path.join(dir, 'loader.mjs');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      md,
      ['# Doc', '', '```ts main', "console.log('loader works')", '```'].join('\n'),
    );
    const source = fs.readFileSync(loaderSrc, 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    });
    fs.writeFileSync(builtLoader, result.outputText);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('runs markdown file', () => {
    const out = execSync(`node --loader ${builtLoader} ${md}`, { encoding: 'utf8' });
    expect(out.trim()).toBe('loader works');
  });
});
