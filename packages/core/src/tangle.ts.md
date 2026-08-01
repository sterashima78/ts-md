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
```
