# Tangle

`.ts.md` document の各 module を、一つずつ TypeScript ファイルへ書き出します。

## prepareOutputDir

```ts prepareOutputDir
import fs from 'node:fs/promises';
import path from 'node:path';

export async function prepareOutputDir(baseFile: string, outDir: string) {
  const baseName = path.basename(baseFile, '.ts.md');
  const baseOut = path.join(outDir, baseName);
  await fs.mkdir(baseOut, { recursive: true });
  return baseOut;
}
```

## writeModule

```ts writeModule
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TsMdModule } from './parser.ts.md';

export async function writeModule(
  baseOut: string,
  module: TsMdModule,
  rename?: (module: TsMdModule) => string,
) {
  const relativePath = rename
    ? rename(module)
    : `${module.name}.${module.language}`;
  const filePath = path.join(baseOut, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, module.code, 'utf8');
  return filePath;
}
```

## tangle

```ts tangle
import type { TsMdDocument, TsMdModule } from './parser.ts.md';
import { prepareOutputDir } from ':prepareOutputDir';
import { writeModule } from ':writeModule';

export async function tangle(
  document: TsMdDocument,
  outDir: string,
  rename?: (module: TsMdModule) => string,
): Promise<string[]> {
  const baseOut = await prepareOutputDir(document.uri, outDir);
  return Promise.all(
    document.modules.map((module) => writeModule(baseOut, module, rename)),
  );
}
```

## 公開インタフェース

```ts main
export { tangle } from ':tangle';

if (import.meta.vitest) {
  await import(':tangle.test');
}
```

## Tests

```ts tangle.test
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocument } from './parser.ts.md';
import { tangle } from ':tangle';

function fence(header: string, code: string) {
  return ['```' + header, code, '```'].join('\n');
}

describe('tangle', () => {
  it('writes one file for each module', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tangle-'));
    const document = parseDocument(
      [
        fence('ts main', 'export const value = 1'),
        fence('tsx view', 'export const view = <div />'),
      ].join('\n\n'),
      '/doc.ts.md',
    );

    await tangle(document, tmp);

    expect(
      await fs.readFile(path.join(tmp, 'doc', 'main.ts'), 'utf8'),
    ).toBe('export const value = 1');
    expect(
      await fs.readFile(path.join(tmp, 'doc', 'view.tsx'), 'utf8'),
    ).toBe('export const view = <div />');

    await fs.rm(tmp, { recursive: true, force: true });
  });
});
```
