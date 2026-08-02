# Tangling modules into files

文芸的プログラミングでは、説明とコードを一緒に書いた source document から、ツールが扱いやすい通常の source file を取り出す処理を tangle と呼びます。

TS-MD では一つの code fence が一つの module なので、tangle も module ごとに一つの `.ts` または `.tsx` file を生成します。処理を directory の準備、単一 module の書き込み、document 全体の展開に分けることで、命名規則だけを差し替えられる構成にします。

## Choosing the document directory

複数 document の同名 module が衝突しないよう、出力先には元 document の basename を使った subdirectory を作ります。

たとえば `src/app.ts.md` は `<outDir>/app/` に展開されます。

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

## Writing one module

既定の file name は module 名と fence の言語から作ります。`rename` callback が渡された場合は、呼び出し側が directory を含む相対 path を決められます。

書き込み前に親 directory を作るため、rename callback は `features/example.ts` のような階層も返せます。返り値として実際に書いた path を残し、CLI が結果を表示できるようにします。

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

## Expanding the whole document

parser が module の順序と code を確定した後は、各 module の書き込みを独立に実行できます。`Promise.all` により、結果の配列は document 内の module 順を保ったまま返ります。

この関数は Markdown を再解析しません。入力を `TsMdDocument` に限定することで、module 名の検証と source range の決定は parser だけの責務にします。

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

## Public surface

外部には document 単位の操作だけを公開します。directory 構成と単一 file の書き込みは、この処理を説明するために分割した内部 module です。

```ts main
export { tangle } from ':tangle';
```
