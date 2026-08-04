# Parsing command-line arguments

CLI の引数解析を executable entry から分離します。この document の `main` module は副作用を持たず、別 document からファイル名だけで import できます。

`check` と `run` の後続引数は下位 tool に渡すため、解釈せず元の順序を保ちます。CLI 自身が所有する `tangle` の option だけを厳密に検証します。

## Command model

```ts parseCliArgs
import { parseArgs } from 'node:util';

export type CliInvocation =
  | { command: 'help'; subject?: 'check' | 'run' | 'tangle' }
  | { command: 'check'; args: string[] }
  | { command: 'run'; entry: string; args: string[] }
  | { command: 'tangle'; globs: string[]; outDir: string };

export function parseCliArgs(args: string[]): CliInvocation {
  const topLevel = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
    strict: false,
  });
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    return { command: 'help' };
  }
  if (command !== 'check' && command !== 'run' && command !== 'tangle') {
    throw new TypeError(`Unknown command: ${command}`);
  }

  const rest = args.slice(1);
  if (topLevel.values.help) {
    return {
      command: 'help',
      subject: command,
    };
  }

  if (command === 'check') return { command, args: rest };

  if (command === 'run') {
    const [entry, ...nodeArgs] = rest;
    if (!entry) throw new TypeError('The run command requires an entry');
    return { command, entry, args: nodeArgs };
  }

  const tangle = parseArgs({
    args: rest,
    options: {
      outDir: { type: 'string', short: 'o', default: 'dist' },
    },
    allowPositionals: true,
    strict: true,
  });
  return {
    command,
    globs: tangle.positionals,
    outDir: tangle.values.outDir,
  };
}
```

## Public module

別 document はこのファイル名を import し、`main` module から parser と型を受け取ります。実装 chunk は同じ document 内だけで `:parseCliArgs` として参照します。

```ts main
export { parseCliArgs } from ':parseCliArgs';
export type { CliInvocation } from ':parseCliArgs';
```
