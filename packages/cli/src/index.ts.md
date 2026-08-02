# Composing the command-line interface

CLI entrypoint は domain logic を実装せず、command line の形を各 command function へ対応付けます。型検査、tangle、実行の詳細は別 document に置き、この file では利用者が見る command surface と process の終了方法だけを決めます。

## Registering commands

`createCli` を関数として公開することで、実際に `process.argv` を parse せずに command 構成を test や他の entrypoint から再利用できます。

`check` と `run` は下位 tool へ未知の option を渡す必要があるため `allowUnknownOption` を使います。`tangle` は CLI 自身が `outDir` を解釈します。

```ts createCli
import { Command } from 'commander';
import { runCheck } from './commands/check.ts.md';
import { runTsMd } from './commands/run.ts.md';
import { runTangle } from './commands/tangle.ts.md';

export function createCli() {
  const program = new Command('tsmd');

  program
    .command('check [tscArgs...]')
    .allowUnknownOption()
    .description('Type-check a tsconfig project without emitting files')
    .action((tscArgs: string[]) => {
      process.exitCode = runCheck(tscArgs);
    });

  program
    .command('tangle [globs...]')
    .option('-o, --outDir <dir>', 'output directory', 'dist')
    .description('Write each .ts.md module to a TypeScript file')
    .action((globs: string[], options: { outDir: string }) =>
      runTangle(globs, options.outDir),
    );

  program
    .command('run <entry>')
    .allowUnknownOption()
    .description('Execute a .ts.md main or named module')
    .action((entry: string, _options: unknown, command: Command) => {
      const rest =
        command.parent?.args.slice(command.parent.args.indexOf('run') + 2) ?? [];
      runTsMd(entry, rest);
    });

  return program;
}
```

`run` の entry より後ろにある引数は Node.js で実行される module へ渡すため、Commander の parsed option として消費せず元の引数列から切り出します。

## Executable module

`main` module は package の executable entry です。構成関数を再公開した後、現在の process arguments を parse します。shebang をこの小さな module に閉じ込めることで、command 定義自体は通常の TypeScript function として扱えます。

```ts main
#!/usr/bin/env node
import { createCli } from ':createCli';

export { createCli };

createCli().parse();
```
