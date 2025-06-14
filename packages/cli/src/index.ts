#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck } from './commands/check';
import { runEmit } from './commands/emit';
import { runTsMd } from './commands/run';
import { runTangle } from './commands/tangle';

const program = new Command('tsmd');

program
  .command('check [globs...]')
  .description('Type-check .ts.md files')
  .action((globs: string[]) => runCheck(globs));

program
  .command('tangle [globs...]')
  .option('-o, --outDir <dir>', 'output directory', 'dist')
  .description('Extract code chunks to real files')
  .action((globs: string[], opts: { outDir: string }) =>
    runTangle(globs, opts.outDir),
  );

program
  .command('emit [globs...]')
  .option('-o, --outDir <dir>', 'output directory', 'dist')
  .description('Emit .d.ts files for .ts.md documents')
  .action((globs: string[], opts: { outDir: string }) =>
    runEmit(globs, opts.outDir),
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

program.parse();
