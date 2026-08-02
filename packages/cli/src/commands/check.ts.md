# Delegating project checks to the compiler

`tsmd check` は独自の file collection や簡易 type checker を持ちません。`ts-md-tsc` を通常の TypeScript compiler と同じ command-line arguments で起動し、project 全体の診断を一つの実装へ集約します。

CLI が追加する方針は一つだけです。check command から file を生成しないよう、利用者の arguments の後ろに `--noEmit` を必ず付けます。後ろの option が優先されるため、呼び出し側が `--emitDeclarationOnly` などを指定しても check の意味は変わりません。

## Locating and invoking the compiler

package の公開 executable path を推測せず、`package.json` の位置から同じ directory にある `index.js` を求めます。現在の Node.js executable で同期実行し、標準入出力はそのまま親 process へ接続します。

同期実行にしているのは、Commander の action が終了 status を直ちに `process.exitCode` へ設定できるようにするためです。spawn 自体に失敗した場合は error を隠さず投げ、compiler が終了した場合はその status を返します。

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

## Public command function

CLI entrypoint が必要とする一つの operation だけを公開します。

```ts main
export { runCheck } from ':runCheck';
```
