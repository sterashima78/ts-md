import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

it('executes .ts.md via loader', () => {
  const build = spawnSync('npx', [
    'tsc',
    '-p',
    path.resolve(__dirname, '../packages/core/tsconfig.json'),
    '--outDir',
    path.resolve(__dirname, 'tmp/core'),
  ]);
  expect(build.status).toBe(0);
  const build2 = spawnSync('npx', [
    'tsc',
    '-p',
    path.resolve(__dirname, '../packages/loader/tsconfig.json'),
    '--outDir',
    path.resolve(__dirname, 'tmp/loader'),
  ]);
  expect(build2.status).toBe(0);
  const loader = path.resolve(__dirname, 'tmp/loader/loader/src/index.js');
  const file = path.resolve(__dirname, '../docs/app.ts.md');
  const result = spawnSync(
    'node',
    ['--import', 'tsx/esm', '--loader', loader, file],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('hello ts-md');
  fs.rmSync(path.resolve(__dirname, 'tmp'), { recursive: true, force: true });
});
