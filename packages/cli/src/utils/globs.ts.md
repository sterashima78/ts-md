# Expanding document patterns

CLI command は利用者が指定した glob pattern を受け取りますが、下位の処理は具体的な file path を必要とします。この document は両者の境界だけを担当します。

pattern が省略された場合は current working directory 以下のすべての `.ts.md` document を対象にします。結果を絶対 path にそろえることで、その後に working directory が変わっても同じ document を参照できます。

## From patterns to files

```ts expandGlobs
import fg from 'fast-glob';

export async function expandGlobs(globs: string[]): Promise<string[]> {
  return fg(globs.length ? globs : ['**/*.ts.md'], { absolute: true });
}
```

## Public helper and its example

helper は command から再利用できるよう公開します。test は temporary directory に一つの document を作り、返り値が実際の absolute path と一致することを確認します。

```ts main
export { expandGlobs } from ':expandGlobs';

if (import.meta.vitest) {
  await import(':expandGlobs.test');
}
```

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
