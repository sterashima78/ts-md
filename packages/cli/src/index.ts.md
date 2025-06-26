# CLI Entrypoint

コマンド登録をまとめた `createCli` 関数を定義し、`main` ブロックではそれを実行するだけにします。

```ts createCli
import { Command } from 'commander';
import { runCheck } from './commands/check.ts.md';
import { runTsMd } from './commands/run.ts.md';
import { runTangle } from './commands/tangle.ts.md';

export function createCli() {
  const program = new Command('tsmd');

  program
    .command('check [args...]')
    .allowUnknownOption()
    .description('tsc と同様に .ts.md を型チェックします')
    .action(() => runCheck());

  program
    .command('tangle [globs...]')
    .option('-o, --outDir <dir>', 'output directory', 'dist')
    .description('Extract code chunks to real files')
    .action((globs: string[], opts: { outDir: string }) =>
      runTangle(globs, opts.outDir),
    );

  program
    .command('run <file>')
    .allowUnknownOption()
    .description('Execute a .ts.md file with Node')
    .action((file: string, _opts: unknown, cmd: Command) => {
      const rest =
        cmd.parent?.args.slice(cmd.parent.args.indexOf('run') + 2) ?? [];
      runTsMd(file, rest);
    });

  return program;
}
```

## 公開インタフェース

```ts main
#!/usr/bin/env node
export { createCli } from ':createCli';

createCli().parse();
```
