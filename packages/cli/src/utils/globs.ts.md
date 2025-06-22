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
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expandGlobs } from ':expandGlobs';

describe('expandGlobs', () => {
  const dir = path.join(process.cwd(), 'test', 'fixtures', 'expand-globs');
  const files = [
    path.join(dir, 'a.ts.md'),
    path.join(dir, 'nested', 'b.ts.md'),
  ];

  beforeAll(async () => {
    await fs.mkdir(path.join(dir, 'nested'), { recursive: true });
    await fs.writeFile(files[0], '', 'utf8');
    await fs.writeFile(files[1], '', 'utf8');
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns matching files', async () => {
    const result = await expandGlobs([path.join(dir, '**/*.ts.md')]);
    expect(result.sort()).toEqual(files.sort());
  });
});
```
