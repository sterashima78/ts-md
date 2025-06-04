import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createTsMdPlugin } from '../src';

const plugin = createTsMdPlugin();

describe('ts-md-ls-core diagnostics', () => {
  const dir = path.join(__dirname, 'fixtures');
  const aPath = path.join(dir, 'a.ts.md');
  const mainPath = path.join(dir, 'main.ts.md');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      aPath,
      ['# A', '', '```ts foo', "export const msg: number = 'hi'", '```'].join(
        '\n',
      ),
    );
    fs.writeFileSync(
      mainPath,
      [
        '# Main',
        '',
        '```ts main',
        "import '#./a.ts.md:foo'",
        "import { msg } from '#./a.ts.md:foo'",
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports diagnostics across docs', () => {
    const program = plugin.createProgram(mainPath);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(diagnostics.length).toBe(1);
  });
});
