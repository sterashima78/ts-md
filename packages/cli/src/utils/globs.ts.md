# glob 展開

```ts expandGlobs
import fg from 'fast-glob';

export async function expandGlobs(globs: string[]): Promise<string[]> {
  return fg(globs.length ? globs : ['**/*.ts.md'], { absolute: true });
}
```

## 公開インタフェース

```ts main
export { expandGlobs } from ':expandGlobs';

if (import.meta.vitest) {
  await import(':expandGlobs.test');
}
```

## Tests

```ts expandGlobs.test
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandGlobs } from ':expandGlobs';

describe('expandGlobs', () => {
  it('returns matched files', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'globs-'));
    const file = path.join(tmp, 'doc.ts.md');
    await fs.writeFile(file, '', 'utf8');
    const files = await expandGlobs([`${tmp}/*.ts.md`]);
    expect(files).toEqual([file]);
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
```
