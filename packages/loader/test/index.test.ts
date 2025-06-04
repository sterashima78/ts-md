import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

describe('ts-md-loader', () => {
  const dir = path.join(__dirname, 'fixtures');
  const md = path.join(dir, 'doc.ts.md');
  const loaderSrc = path.join(__dirname, '..', 'src', 'index.ts');
  const builtLoader = path.join(dir, 'loader.mjs');
  const coreSrc = path.join(__dirname, '..', '..', 'core', 'src', 'index.ts');
  const coreDist = path.join(__dirname, '..', '..', 'core', 'dist');
  const builtCore = path.join(coreDist, 'index.js');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      md,
      ['# Doc', '', '```ts main', "console.log('loader works')", '```'].join(
        '\n',
      ),
    );
    const source = fs.readFileSync(loaderSrc, 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    });
    fs.writeFileSync(builtLoader, result.outputText);

    const coreSource = fs.readFileSync(coreSrc, 'utf8');
    fs.mkdirSync(coreDist, { recursive: true });
    const coreResult = ts.transpileModule(coreSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    });
    fs.writeFileSync(builtCore, coreResult.outputText);
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(coreDist, { recursive: true, force: true });
  });

  it('runs markdown file', () => {
    const out = execSync(`node --loader ${builtLoader} ${md}`, {
      encoding: 'utf8',
    });
    expect(out.trim()).toBe('loader works');
  });
});
