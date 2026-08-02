# Running a child Node.js process

`run` command は現在の CLI process の中で target module を import せず、loader option を付けた別の Node.js process を起動します。この helper は process 起動の共通部分を小さな Promise API に包みます。

標準入出力は継承するため、target program の出力、対話入力、error は通常の command と同じように利用者へ届きます。Node.js executable には `process.execPath` を使い、CLI 自身を動かしている runtime と同じ binary を選びます。

## Spawning and observing completion

working directory が指定されなければ現在の directory を使います。child process の終了 code を呼び出し側へ返し、signal などで code が得られない場合は現在の互換動作として 0 を返します。

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

## Public helper and smoke test

test では最小の inline program を起動し、正常終了 code が Promise を通して返ることを確認します。

```ts main
export { spawnNode } from ':spawnNode';

if (import.meta.vitest) {
  await import(':spawnNode.test');
}
```

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
