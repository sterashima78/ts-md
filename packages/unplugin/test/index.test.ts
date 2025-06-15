import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'rollup';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
    fs.writeFileSync(entry, "import './doc.ts.md:main';");

    unpluginFactory = (await import('../src')).unplugin;
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('loads chunk code', async () => {
    const plugin = unpluginFactory.rollup();
    const p = (Array.isArray(plugin) ? plugin[0] : plugin) as Plugin;
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const resolved = (p as any).resolveId('./doc.ts.md:main', entry);
    expect(resolved).toBe(`${mdPath}?block=main&lang.ts`);
    const id = resolved as string;
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const loaded = await (p as any).load(id);
    const code = typeof loaded === 'string' ? loaded : loaded?.code;
    expect(code?.trim()).toBe("export const msg = 'hi'");
  });

  it('re-exports blocks from document', async () => {
    const plugin = unpluginFactory.rollup();
    const p = (Array.isArray(plugin) ? plugin[0] : plugin) as Plugin;
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const loaded = await (p as any).load(mdPath);
    const code = typeof loaded === 'string' ? loaded : loaded?.code;
    expect(code?.trim()).toBe(`export * from '${mdPath}?block=main&lang.ts'`);
  });
});
