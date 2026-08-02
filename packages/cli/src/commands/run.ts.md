# Running one document module

`tsmd run` は `.ts.md` document を直接解釈しません。entry の表記を共通の module identity へ変換し、Node.js、TypeScript runtime、TS-MD loader を組み合わせて実行します。

利用者は document path だけを渡して `main` を実行するか、`file.ts.md:module` の形で named module を entry にできます。まずこの表記を解析し、その後は core が定義する仮想 module file name を使います。

## Parsing the entry notation

`.ts.md:` の最後の出現を境界にするため、path の前半に `:` が含まれていても module 名との区切りを失いません。named module が指定されていない場合は `main` を補います。

不完全な `file.ts.md:` は別の意味へ推測せず error にします。返り値を loader や bundler と同じ `{ documentPath, moduleName }` にそろえることで、CLI 固有の identity を作りません。

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

## Building the Node.js process

実行 process には二つの extension point を渡します。`tsx/esm` が TypeScript runtime を提供し、TS-MD loader が仮想 module と document 内 import を解決します。

entry は仮想 module file name に変換してから Node.js へ渡します。working directory は元 document の directory に設定し、実行 code から見た relative file access も document の位置を基準にします。残りの command-line arguments は entry module へそのまま渡します。

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

## Public command module

entry parser も public にして、CLI notation を利用する adapter や test が同じ規則を使えるようにします。test module は Vitest 実行時だけ読み込みます。

```ts main
export { parseEntry } from ':parseEntry';
export { runTsMd } from ':runTsMd';

if (import.meta.vitest) {
  await import(':runTsMd.test');
}
```

## Executable examples of the notation

ここでは process 起動ではなく、document-only と named-module の二つの entry 表記が同じ identity model に変換されることを固定します。

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
