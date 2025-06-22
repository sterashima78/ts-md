# Node プロセス実行

```ts spawnNode
import { spawn } from 'node:child_process';

export function spawnNode(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<number> {
  return new Promise((res) => {
    const p = spawn(process.execPath, args, {
      stdio: 'inherit',
      cwd: opts.cwd ?? process.cwd(),
    });
    p.on('close', (code) => res(code ?? 0));
  });
}
```

## 公開インタフェース

```ts main
export { spawnNode } from ':spawnNode';

if (import.meta.vitest) {
  await import(':spawnNode.test');
}
```

## Tests

```ts spawnNode.test
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { spawnNode } from ':spawnNode';

describe('spawnNode', () => {
  it('executes Node process', async () => {
    const dir = await fs.mkdtemp(path.join(process.cwd(), 'spawn-'));
    const file = path.join(dir, 'index.js');
    await fs.writeFile(file, "console.log('ok')", 'utf8');
    const code = await spawnNode([file], { cwd: dir });
    expect(code).toBe(0);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
```
