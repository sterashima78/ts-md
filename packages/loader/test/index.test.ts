import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

describe('ts-md-loader', () => {
  const dir = path.join(__dirname, 'fixtures');
  const md = path.join(dir, 'doc.ts.md');
  const loaderSrc = path.join(__dirname, '..', 'src', 'index.ts');
  const builtLoader = path.join(dir, 'loader.mjs');
  const coreSrcDir = path.join(__dirname, '..', '..', 'core', 'src');
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
    const loaderCode = result.outputText.replace(
      '@sterashima78/ts-md-core',
      pathToFileURL(builtCore).href,
    );
    fs.writeFileSync(builtLoader, loaderCode);

    fs.mkdirSync(coreDist, { recursive: true });
    for (const file of fs.readdirSync(coreSrcDir)) {
      if (!file.endsWith('.ts')) continue;
      const src = path.join(coreSrcDir, file);
      const dest = path.join(coreDist, file.replace(/\.ts$/, '.js'));
      const srcText = fs.readFileSync(src, 'utf8');
      const out = ts.transpileModule(srcText, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext,
        },
      });
      const js = out.outputText.replace(
        /from '(\.\/.+?)'/g,
        (m, p) => `from '${p}.js'`,
      );
      fs.writeFileSync(dest, js);
    }
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    // keep coreDist to avoid conflicts across parallel tests
  });

  it('runs markdown file', () => {
    const out = execSync(
      `node --import tsx/esm --loader ${builtLoader} ${md}`,
      { encoding: 'utf8' },
    );
    expect(out.trim()).toBe('loader works');
  });
});
