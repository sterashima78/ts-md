import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'rollup';

let unpluginFactory: typeof import('../src').unplugin;

describe('ts-md-unplugin', () => {
  const dir = path.join(__dirname, 'fixtures');
  const mdPath = path.join(dir, 'doc.ts.md');
  const entry = path.join(dir, 'entry.ts');

  beforeAll(async () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      mdPath,
      ['# Doc', '', '```ts main', "export const msg = 'hi'", '```'].join('\n'),
    );
    fs.writeFileSync(entry, "import '#./doc.ts.md:main';");

    const coreSrcDir = path.join(__dirname, '..', '..', 'core', 'src');
    const coreDist = path.join(__dirname, '..', '..', 'core', 'dist');
    fs.mkdirSync(coreDist, { recursive: true });
    for (const file of fs.readdirSync(coreSrcDir)) {
      if (!file.endsWith('.ts')) continue;
      const src = path.join(coreSrcDir, file);
      const dest = path.join(coreDist, file.replace(/\.ts$/, '.js'));
      const source = fs.readFileSync(src, 'utf8');
      const result = require('typescript').transpileModule(source, {
        compilerOptions: {
          module: require('typescript').ModuleKind.ESNext,
          target: require('typescript').ScriptTarget.ESNext,
        },
      });
      const js = result.outputText.replace(
        /from '(\.\/.+?)'/g,
        (m, p) => `from '${p}.js'`,
      );
      fs.writeFileSync(dest, js);
    }

    unpluginFactory = (await import('../src')).unplugin;
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    // keep coreDist to avoid conflicts across parallel tests
  });

  it('loads chunk code', async () => {
    const plugin = unpluginFactory.rollup();
    const p = (Array.isArray(plugin) ? plugin[0] : plugin) as Plugin;
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const resolved = (p as any).resolveId('#./doc.ts.md:main', entry);
    expect(resolved).toBeTruthy();
    const id = resolved as string;
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const loaded = await (p as any).load(id);
    const code = typeof loaded === 'string' ? loaded : loaded?.code;
    expect(code?.trim()).toBe("export const msg = 'hi'");
  });
});
