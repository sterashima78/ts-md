# Module ID

`.ts.md` document 内の module と、各ツールが扱う仮想 TypeScript ファイル名の対応を一元管理します。

```ts types
export interface TsMdModuleId {
  documentPath: string;
  moduleName: string;
}
```

```ts constants
export const TS_MD_VIRTUAL_DIRECTORY_SUFFIX = '.__tsmd__';
```

```ts createVirtualModuleFileName
import path from 'node:path';
import { TS_MD_VIRTUAL_DIRECTORY_SUFFIX } from ':constants';
import type { TsMdModuleId } from ':types';

export function createVirtualModuleFileName({
  documentPath,
  moduleName,
}: TsMdModuleId): string {
  const directory = `${path.resolve(documentPath)}${TS_MD_VIRTUAL_DIRECTORY_SUFFIX}`;
  return path.join(directory, `${encodeURIComponent(moduleName)}.ts`);
}
```

```ts parseVirtualModuleFileName
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TS_MD_VIRTUAL_DIRECTORY_SUFFIX } from ':constants';
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
  const marker = `${TS_MD_VIRTUAL_DIRECTORY_SUFFIX}${path.sep}`;
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1 || !normalized.endsWith('.ts')) return;

  const documentPath = normalized.slice(0, markerIndex);
  if (!documentPath.endsWith('.ts.md')) return;

  const encodedModuleName = normalized.slice(
    markerIndex + marker.length,
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
export { TS_MD_VIRTUAL_DIRECTORY_SUFFIX } from ':constants';
export type { TsMdModuleId } from ':types';

if (import.meta.vitest) {
  await import(':module-id.test');
}
```

```ts module-id.test
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVirtualModuleFileName } from ':createVirtualModuleFileName';
import { parseVirtualModuleFileName } from ':parseVirtualModuleFileName';

describe('virtual module file names', () => {
  it('round-trips module names without delimiter ambiguity', () => {
    const id = {
      documentPath: path.resolve('/workspace/doc.ts.md'),
      moduleName: 'foo__bar',
    };
    const fileName = createVirtualModuleFileName(id);
    expect(parseVirtualModuleFileName(fileName)).toEqual(id);
  });
});
```
