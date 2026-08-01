# check コマンド

`tsconfig.json` に従って型検査する `runCheck` 関数を公開します。
`ts-md-tsc` に `--noEmit` を付けて委譲するため、コンパイラと同じ診断結果になります。

```ts runCheck
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

export function runCheck(tscArgs: string[] = []) {
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve(
    '@sterashima78/ts-md-tsc/package.json',
  );
  const executable = path.join(path.dirname(packageJson), 'index.js');
  const result = spawnSync(
    process.execPath,
    [executable, ...tscArgs, '--noEmit'],
    { stdio: 'inherit' },
  );

  if (result.error) throw result.error;
  return result.status ?? 1;
}
```

## 公開インタフェース

```ts main
export { runCheck } from ':runCheck';
```
