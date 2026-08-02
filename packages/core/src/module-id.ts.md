# Virtual module identity

`.ts.md` document に書かれた module は、Node.js、bundler、TypeScript language service から見ると通常の TypeScript ファイルではありません。各ツールに同じ実体を指させるため、この文書で document path と module 名を一つの仮想ファイル名へ変換する規則を定めます。

仮想ファイル名には次の性質が必要です。

- 同じ document と module から常に同じ名前が得られる
- 元の document と同じディレクトリに属し、相対 import の基準を保てる
- module 名に記号が含まれてもファイル名として安全に往復できる
- 通常の `.ts` ファイルを誤って仮想 module と判定しない

## The logical identity

ツール間で共有したい本来の識別子は、ファイル名ではなくこの二要素です。

```ts types
export interface TsMdModuleId {
  documentPath: string;
  moduleName: string;
}
```

## A recognizable boundary

元の document path と encoded module 名の境界には、通常のファイル名と衝突しにくい固定 marker を置きます。生成側と解析側が同じ定数を使うことで、形式の定義を一か所に保ちます。

```ts constants
export const TS_MD_VIRTUAL_MODULE_MARKER = '.__tsmd__.';
```

## Encoding an identity as a file name

最初に document path を絶対パスへ正規化し、その末尾に marker、URL encode した module 名、`.ts` 拡張子を付けます。仮想 module を document の隣に置いた形にすることが重要で、これにより module 内の `./helper.js` のような通常の相対 import も元 document の場所を基準に解決されます。

```ts createVirtualModuleFileName
import path from 'node:path';
import { TS_MD_VIRTUAL_MODULE_MARKER } from ':constants';
import type { TsMdModuleId } from ':types';

export function createVirtualModuleFileName({
  documentPath,
  moduleName,
}: TsMdModuleId): string {
  return `${path.resolve(documentPath)}${TS_MD_VIRTUAL_MODULE_MARKER}${encodeURIComponent(moduleName)}.ts`;
}
```

## Recovering the logical identity

解析側は loader から渡される `file:` URL と、compiler や bundler から渡される path の両方を受け取ります。query と fragment を除去して path を正規化した後、marker と拡張子を検証します。

途中の条件を厳しくしているのは、似た名前の通常ファイルを TS-MD module と誤認しないためです。module 名の decode に失敗した場合も、壊れた仮想 ID として例外を広げず `undefined` を返します。

```ts parseVirtualModuleFileName
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TS_MD_VIRTUAL_MODULE_MARKER } from ':constants';
import type { TsMdModuleId } from ':types';

export function parseVirtualModuleFileName(
  value: string,
): TsMdModuleId | undefined {
  let fileName = value;
  if (fileName.startsWith('file:')) {
    try {
      fileName = fileURLToPath(fileName);
    } catch {
      return;
    }
  }
  fileName = fileName.replace(/[?#].*$/, '');

  const normalized = path.normalize(fileName);
  const markerIndex = normalized.lastIndexOf(TS_MD_VIRTUAL_MODULE_MARKER);
  if (markerIndex === -1 || !normalized.endsWith('.ts')) return;

  const documentPath = normalized.slice(0, markerIndex);
  if (!documentPath.endsWith('.ts.md')) return;

  const encodedModuleName = normalized.slice(
    markerIndex + TS_MD_VIRTUAL_MODULE_MARKER.length,
    -'.ts'.length,
  );
  if (!encodedModuleName || encodedModuleName.includes(path.sep)) return;

  try {
    return {
      documentPath,
      moduleName: decodeURIComponent(encodedModuleName),
    };
  } catch {
    return;
  }
}
```

## Public surface

生成と解析は必ず対で使われるため両方を公開します。marker も adapter 側で同じ規則を参照できるよう公開しますが、論理的な API の中心は `TsMdModuleId` です。

```ts main
export { createVirtualModuleFileName } from ':createVirtualModuleFileName';
export { parseVirtualModuleFileName } from ':parseVirtualModuleFileName';
export { TS_MD_VIRTUAL_MODULE_MARKER } from ':constants';
export type { TsMdModuleId } from ':types';
```
