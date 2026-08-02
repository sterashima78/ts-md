# Composing the command-line interface

CLI entrypoint は domain logic を実装せず、command line の形を各 command function へ対応付けます。型検査、tangle、実行の詳細は別 document に置き、この file では利用者が見る command surface と process の終了方法だけを決めます。

## Describing parsed commands

Node.js 標準の `parseArgs` を使い、process を起動せず検証できる command model に変換します。`check` と `run` の後続引数は下位 tool に渡すため、解釈せず元の順序を保ちます。CLI 自身が所有する `tangle` の option だけを厳密に検証します。

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

## Dispatching commands

help text も小さな data として保持し、外部 framework の暗黙的な出力に依存しません。`runCli` は parse 結果を対応する command function へ渡し、終了 status が必要な `check` だけ `process.exitCode` を更新します。

```ts runCli
import { runCheck } from './commands/check.ts.md';
import { runTsMd } from './commands/run.ts.md';
import { runTangle } from './commands/tangle.ts.md';
import { parseCliArgs } from ':parseCliArgs';

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

export { parseCliArgs } from ':parseCliArgs';
export { runCli };

try {
  await runCli();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

if (import.meta.vitest) {
  await import(':parseCliArgs.test');
}
```

## Executable examples of argument parsing

下位 tool へ渡す option の順序と、CLI が所有する option の解釈を固定します。

```ts parseCliArgs.test
import { describe, expect, it } from 'vitest';
import { parseCliArgs } from ':parseCliArgs';

describe('parseCliArgs', () => {
  it('preserves compiler arguments', () => {
    expect(parseCliArgs(['check', '-p', 'tsconfig.json'])).toEqual({
      command: 'check',
      args: ['-p', 'tsconfig.json'],
    });
  });

  it('separates the run entry from module arguments', () => {
    expect(parseCliArgs(['run', 'app.ts.md', '--answer', '42'])).toEqual({
      command: 'run',
      entry: 'app.ts.md',
      args: ['--answer', '42'],
    });
  });

  it('parses tangle options and globs', () => {
    expect(
      parseCliArgs(['tangle', 'src/**/*.ts.md', '--outDir', 'generated']),
    ).toEqual({
      command: 'tangle',
      globs: ['src/**/*.ts.md'],
      outDir: 'generated',
    });
  });
});
```
