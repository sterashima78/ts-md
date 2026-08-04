# Composing the command-line interface

CLI entrypoint は domain logic を実装せず、command line の形を各 command function へ対応付けます。型検査、tangle、実行の詳細は別 document に置き、この file では利用者が見る command surface と process の終了方法だけを決めます。

引数解析も `parse-cli-args.ts.md` に分離し、この document からはファイル名だけで `main` module を import します。これにより executable entry を直接 import せずに parser を検証できます。

## Dispatching commands

help text を小さな data として保持し、外部 framework の暗黙的な出力に依存しません。`runCli` は parse 結果を対応する command function へ渡し、終了 status が必要な `check` だけ `process.exitCode` を更新します。

```ts runCli
import { runCheck } from './commands/check.ts.md';
import { runTsMd } from './commands/run.ts.md';
import { runTangle } from './commands/tangle.ts.md';
import { parseCliArgs } from './parse-cli-args.ts.md';

const help = {
  root: `Usage: tsmd <command> [options]

Commands:
  check [...tscArgs]              Type-check a tsconfig project
  run <entry> [...nodeArgs]       Execute a .ts.md module
  tangle [globs...] [options]     Write modules as TypeScript files`,
  check: 'Usage: tsmd check [...tscArgs]',
  run: 'Usage: tsmd run <entry> [...nodeArgs]',
  tangle: `Usage: tsmd tangle [globs...] [options]

Options:
  -o, --outDir <dir>              Output directory (default: dist)`,
};

export async function runCli(args = process.argv.slice(2)) {
  const invocation = parseCliArgs(args);

  if (invocation.command === 'help') {
    console.log(invocation.subject ? help[invocation.subject] : help.root);
    return;
  }
  if (invocation.command === 'check') {
    process.exitCode = runCheck(invocation.args);
    return;
  }
  if (invocation.command === 'run') {
    await runTsMd(invocation.entry, invocation.args);
    return;
  }
  await runTangle(invocation.globs, invocation.outDir);
}
```

## Executable module

`main` module は package の executable entry です。parse error は stack trace ではなく簡潔な message として表示し、失敗 status を設定します。

```ts main
#!/usr/bin/env node
import { runCli } from ':runCli';

try {
  await runCli();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
```
