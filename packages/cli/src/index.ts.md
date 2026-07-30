# CLI Entrypoint

```ts createCli
import { Command } from 'commander';
import { runCheck } from './commands/check.ts.md';
import { runTsMd } from './commands/run.ts.md';
import { runTangle } from './commands/tangle.ts.md';

export function createCli() {
  const program = new Command('tsmd');

  program
    .command('check [globs...]')
    .description('Type-check .ts.md modules')
    .action((globs: string[]) => runCheck(globs));

  program
    .command('tangle [globs...]')
    .option('-o, --outDir <dir>', 'output directory', 'dist')
    .description('Write each .ts.md module to a TypeScript file')
    .action((globs: string[], options: { outDir: string }) =>
      runTangle(globs, options.outDir),
    );

  program
    .command('run <file>')
    .allowUnknownOption()
    .description('Execute the main module of a .ts.md document')
    .action((file: string, _options: unknown, command: Command) => {
      const rest =
        command.parent?.args.slice(command.parent.args.indexOf('run') + 2) ?? [];
      runTsMd(file, rest);
    });

  return program;
}
```

```ts main
#!/usr/bin/env node
export { createCli } from ':createCli';

createCli().parse();
```
