# run コマンド

`runTsMd` 関数は `.ts.md` ファイルを Node で実行するためのヘルパです。

```ts runTsMd
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnNode } from '../utils/spawn.ts.md';

export async function runTsMd(entryFile: string, nodeArgs: string[]) {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('@sterashima78/ts-md-loader');
  const tsx = require.resolve('tsx/esm');
  const abs = path.resolve(entryFile);

  const args = ['--import', tsx, '--loader', loader, abs, ...nodeArgs];
  const code = await spawnNode(args, { cwd: path.dirname(abs) });
  process.exit(code);
}
```

## 公開インタフェース

```ts main
export { runTsMd } from ':runTsMd';
```
