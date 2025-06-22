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
import { describe, expect, it } from 'vitest';
import { spawnNode } from ':spawnNode';

describe('spawnNode', () => {
  it('returns exit code', async () => {
    const code = await spawnNode(['-e', 'console.log("ok")']);
    expect(code).toBe(0);
  });
});
```
