import fs from 'node:fs';
import path from 'node:path';
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
} from '@sterashima78/ts-md-core';
import type { Plugin } from 'rollup';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let unpluginFactory: typeof import('../src/index.ts.md').unplugin;

describe('ts-md-unplugin', () => {
  const dir = path.join(__dirname, 'fixtures');
  const mdPath = path.join(dir, 'doc.ts.md');
  const entry = path.join(dir, 'entry.ts');

  beforeAll(async () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      mdPath,
      [
        '# Doc',
        '',
        '```ts dep',
        "export const msg = 'hi'",
        '```',
        '',
        '```ts main',
        "export { msg } from ':dep'",
        '```',
      ].join('\n'),
    );
    fs.writeFileSync(entry, "import './doc.ts.md';");
    unpluginFactory = (await import('../src/index.ts.md')).unplugin;
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('loads the main module from a document import', async () => {
    const plugin = unpluginFactory.rollup();
    const instance = (Array.isArray(plugin) ? plugin[0] : plugin) as Plugin;
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const resolved = (instance as any).resolveId('./doc.ts.md', entry);
    expect(resolved).toBe(
      createVirtualModuleFileName({
        documentPath: mdPath,
        moduleName: 'main',
      }),
    );
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const loaded = await (instance as any).load(resolved);
    const code = typeof loaded === 'string' ? loaded : loaded?.code;
    expect(code?.trim()).toBe("export { msg } from ':dep'");
  });

  it('resolves a same-document module import', () => {
    const plugin = unpluginFactory.rollup();
    const instance = (Array.isArray(plugin) ? plugin[0] : plugin) as Plugin;
    const mainId = createVirtualModuleFileName({
      documentPath: mdPath,
      moduleName: 'main',
    });
    // biome-ignore lint/suspicious/noExplicitAny: plugin context not needed for test
    const resolved = (instance as any).resolveId(':dep', mainId);
    expect(parseVirtualModuleFileName(resolved)).toEqual({
      documentPath: mdPath,
      moduleName: 'dep',
    });
  });
});
