import fs from 'node:fs';
import path from 'node:path';
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
} from '@sterashima78/ts-md-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let unpluginFactory: typeof import('../src/index.ts.md').unplugin;

type LoadResult = string | { code: string } | null | undefined;

interface TestPlugin {
  resolveId(id: string, importer?: string): string | undefined;
  load(id: string): LoadResult | Promise<LoadResult>;
}

function getRollupPlugin(options?: { include?: RegExp }): TestPlugin {
  const plugin = unpluginFactory.rollup(options);
  return (Array.isArray(plugin) ? plugin[0] : plugin) as unknown as TestPlugin;
}

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
    const instance = getRollupPlugin();
    const resolved = instance.resolveId('./doc.ts.md', entry);
    expect(resolved).toBe(
      createVirtualModuleFileName({
        documentPath: mdPath,
        moduleName: 'main',
      }),
    );
    const loaded = await instance.load(resolved as string);
    const code = typeof loaded === 'string' ? loaded : loaded?.code;
    expect(code?.trim()).toBe("export { msg } from ':dep'");
  });

  it('resolves a same-document module import', () => {
    const instance = getRollupPlugin();
    const mainId = createVirtualModuleFileName({
      documentPath: mdPath,
      moduleName: 'main',
    });
    const resolved = instance.resolveId(':dep', mainId);
    expect(parseVirtualModuleFileName(resolved)).toEqual({
      documentPath: mdPath,
      moduleName: 'dep',
    });
  });

  it('evaluates a global include pattern repeatedly', async () => {
    const instance = getRollupPlugin({ include: /\.ts\.md$/g });
    const resolved = instance.resolveId('./doc.ts.md', entry) as string;

    const first = await instance.load(resolved);
    const second = await instance.load(resolved);

    expect(first).toBe("export { msg } from ':dep'");
    expect(second).toBe(first);
  });
});
