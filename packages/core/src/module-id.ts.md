# Module ID

`.ts.md` document 内の module と、各ツールが扱う仮想 TypeScript ファイル名の対応を一元管理します。

仮想ファイルは元の document と同じディレクトリに配置される名前を使います。これにより、module 内の通常の相対 import も document を基準に解決されます。

```ts types
export interface TsMdModuleId {
  documentPath: string;
  moduleName: string;
}
```

```ts constants
export const TS_MD_VIRTUAL_MODULE_MARKER = '.__tsmd__.';
```

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

```ts main
export { createVirtualModuleFileName } from ':createVirtualModuleFileName';
export { parseVirtualModuleFileName } from ':parseVirtualModuleFileName';
export { TS_MD_VIRTUAL_MODULE_MARKER } from ':constants';
export type { TsMdModuleId } from ':types';
```
