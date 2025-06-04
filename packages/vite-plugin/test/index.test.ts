import fs from 'node:fs';
import path from 'node:path';
import { tsMdPlugin } from '../src';

describe('ts-md-vite-plugin', () => {
  const dir = path.join(__dirname, 'fixtures');
  const mdPath = path.join(dir, 'doc.ts.md');
  const entry = path.join(dir, 'entry.ts');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      mdPath,
      ['# Doc', '', '```ts main', "export const msg = 'hi'", '```'].join('\n'),
    );
    fs.writeFileSync(entry, "import '#./doc.ts.md:main';");
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('loads chunk code', async () => {
    const plugin = tsMdPlugin();
    const resolve = plugin.resolveId as unknown as (
      id: string,
      importer: string,
    ) => string | null;
    const resolved = resolve.call(plugin, '#./doc.ts.md:main', entry);
    expect(resolved).toBeTruthy();
    const id = resolved as string;
    const ctx = { addWatchFile() {} };
    const load = plugin.load as unknown as (
      this: { addWatchFile(file: string): void },
      id: string,
    ) => Promise<string | { code: string } | null>;
    const loaded = await load.call(ctx, id);
    const code = typeof loaded === 'string' ? loaded : loaded?.code;
    expect(code?.trim()).toBe("export const msg = 'hi'");
  });
});
