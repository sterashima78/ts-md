# run コマンド

`.ts.md` document の `main` module、または `file.ts.md:module` で指定した名前付きmoduleをNode.jsで実行します。

```ts parseEntry
import path from 'node:path';

export function parseEntry(entry: string) {
  const marker = '.ts.md:';
  const markerIndex = entry.lastIndexOf(marker);
  if (markerIndex === -1) {
    return {
      documentPath: path.resolve(entry),
      moduleName: 'main',
    };
  }

  const documentPath = path.resolve(
    entry.slice(0, markerIndex + '.ts.md'.length),
  );
  const moduleName = entry.slice(markerIndex + marker.length);
  if (!moduleName) throw new Error('A module name is required after .ts.md:');
  return { documentPath, moduleName };
}
```

```ts runTsMd
import { createRequire } from 'node:module';
import path from 'node:path';
import { createVirtualModuleFileName } from '@sterashima78/ts-md-core';
import { parseEntry } from ':parseEntry';
import { spawnNode } from '../utils/spawn.ts.md';

export async function runTsMd(entry: string, nodeArgs: string[]) {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('@sterashima78/ts-md-loader');
  const tsx = require.resolve('tsx/esm');
  const moduleId = parseEntry(entry);
  const virtualEntry = createVirtualModuleFileName(moduleId);

  const args = [
    '--import',
    tsx,
    '--loader',
    loader,
    virtualEntry,
    ...nodeArgs,
  ];
  const code = await spawnNode(args, {
    cwd: path.dirname(moduleId.documentPath),
  });
  process.exit(code);
}
```

```ts main
export { parseEntry } from ':parseEntry';
export { runTsMd } from ':runTsMd';

if (import.meta.vitest) {
  await import(':runTsMd.test');
}
```

```ts runTsMd.test
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEntry } from ':parseEntry';

describe('parseEntry', () => {
  it('uses main when no module is specified', () => {
    expect(parseEntry('./app.ts.md')).toEqual({
      documentPath: path.resolve('./app.ts.md'),
      moduleName: 'main',
    });
  });

  it('parses a named module entry', () => {
    expect(parseEntry('./app.ts.md:example')).toEqual({
      documentPath: path.resolve('./app.ts.md'),
      moduleName: 'example',
    });
  });
});
```
