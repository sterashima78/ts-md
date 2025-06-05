import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function build(src: string, out: string) {
  const source = fs.readFileSync(src, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, result.outputText);
}

describe('ts-md-cli', () => {
  const dir = path.join(__dirname, 'fixtures');
  const cliEntry = path.join(__dirname, '..', 'src', 'index.ts');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });

    const coreSrc = path.join(__dirname, '..', '..', 'core', 'src');
    const coreDist = path.join(__dirname, '..', '..', 'core', 'dist');
    build(path.join(coreSrc, 'index.ts'), path.join(coreDist, 'index.js'));

    const loaderSrc = path.join(__dirname, '..', '..', 'loader', 'src');
    const loaderDist = path.join(__dirname, '..', '..', 'loader', 'dist');
    build(path.join(loaderSrc, 'index.ts'), path.join(loaderDist, 'index.js'));

    const lsSrc = path.join(__dirname, '..', '..', 'ls-core', 'src');
    const lsDist = path.join(__dirname, '..', '..', 'ls-core', 'dist');
    build(path.join(lsSrc, 'index.ts'), path.join(lsDist, 'index.js'));
    build(path.join(lsSrc, 'plugin.ts'), path.join(lsDist, 'plugin.js'));
    build(path.join(lsSrc, 'parsers.ts'), path.join(lsDist, 'parsers.js'));
    build(
      path.join(lsSrc, 'virtual-file.ts'),
      path.join(lsDist, 'virtual-file.js'),
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(path.join(__dirname, '..', '..', 'core', 'dist'), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(__dirname, '..', '..', 'loader', 'dist'), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(__dirname, '..', '..', 'ls-core', 'dist'), {
      recursive: true,
      force: true,
    });
  });

  const run = (args: string[], cwd?: string) => {
    return execSync(`node --import tsx/esm ${cliEntry} ${args.join(' ')}`, {
      encoding: 'utf8',
      cwd,
    });
  };

  it('check exits with error', () => {
    const f = path.join(dir, 'err.ts.md');
    fs.writeFileSync(
      f,
      ['# Doc', '', '```ts main', "const a: number = 'b'", '```'].join('\n'),
    );
    let status = 0;
    try {
      run(['check', f]);
    } catch (e: unknown) {
      status = (e as { status: number }).status;
    }
    expect(status).toBe(1);
  });

  it('tangle outputs files', () => {
    const f = path.join(dir, 'demo.ts.md');
    fs.writeFileSync(
      f,
      ['# Demo', '', '```ts foo', "console.log('hi')", '```'].join('\n'),
    );
    const out = path.join(dir, 'out');
    run(['tangle', f, '-o', out]);
    const target = path.join(out, 'demo', 'foo.ts');
    const code = fs.readFileSync(target, 'utf8');
    expect(code.trim()).toBe("console.log('hi')");
  });

  it('run executes file', () => {
    const f = path.join(dir, 'run.ts.md');
    fs.writeFileSync(
      f,
      ['```ts main', "console.log('works')", '```'].join('\n'),
    );
    const out = run(['run', f]);
    expect(out.trim()).toBe('works');
  });
});
