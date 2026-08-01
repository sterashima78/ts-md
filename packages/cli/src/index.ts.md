# CLI Entrypoint

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

```ts main
#!/usr/bin/env node
import { createCli } from ':createCli';

export { createCli };

createCli().parse();
```
