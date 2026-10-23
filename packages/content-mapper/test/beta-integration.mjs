import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const tscPath = process.env.TSMD_TSC_PATH;
assert.ok(
  tscPath,
  'TSMD_TSC_PATH must point to the TypeScript 7.1 Beta bin/tsc file',
);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(join(tmpdir(), 'ts-md-content-mapper-beta-'));

function runCase(name, files, expectedStatus, expectedPatterns = []) {
  const project = join(root, name);
  const scope = join(project, 'node_modules', '@sterashima78');
  mkdirSync(scope, { recursive: true });
  symlinkSync(
    packageRoot,
    join(scope, 'ts-md-content-mapper'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  mkdirSync(join(project, 'src'), { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    const output = join(project, 'src', file);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, content);
  }

  writeFileSync(
    join(project, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      contentMappers: [
        {
          package: '@sterashima78/ts-md-content-mapper',
          extensions: ['.ts.md'],
        },
      ],
      include: ['src'],
    }),
  );

  const result = spawnSync(
    process.execPath,
    [tscPath, '--runExternalCode', '-p', project],
    { encoding: 'utf8', timeout: 60000 },
  );
  if (result.error) throw result.error;
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  const ok = expectedStatus === 0 ? result.status === 0 : result.status !== 0;
  assert.ok(
    ok,
    `${name}: unexpected compiler exit code ${result.status}\n${output}`,
  );
  for (const pattern of expectedPatterns) {
    assert.match(output, pattern, `${name}: expected ${pattern}\n${output}`);
  }
  process.stdout.write(`PASS ${name} (exit ${result.status})\n`);
}

try {
  runCase(
    'valid',
    {
      'demo.ts.md':
        '# 😀\n\n```ts helper\nconst internal = 12;\n```\n\n```ts main\nexport const answer: number = 42;\n```\n',
      'consumer.ts':
        "import { answer } from './demo.ts.md';\nexport const result: number = answer;\n",
    },
    0,
  );

  runCase(
    'type-errors',
    {
      'demo.ts.md':
        '```ts helper\nexport const invalid: string = 123;\n```\n\n```ts main\nexport const invalidMain: string = 456;\n```\n',
    },
    1,
    [/TS2322/, /string/],
  );

  runCase(
    'missing-main',
    { 'demo.ts.md': '```ts helper\nexport const other = 42;\n```\n' },
    1,
    [/named 'main'/],
  );

  runCase(
    'local-import-not-supported',
    {
      'demo.ts.md':
        "```ts helper\nexport const answer = 42;\n```\n\n```ts main\nimport { answer } from ':helper';\nconsole.log(answer);\n```\n",
    },
    1,
    [/TS2307/],
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
