import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEntry } from '../src/commands/run.ts.md';
import { parseCliArgs } from '../src/parse-cli-args.ts.md';
import { expandGlobs } from '../src/utils/globs.ts.md';
import { spawnNode } from '../src/utils/spawn.ts.md';

describe('parseCliArgs', () => {
  it('compiler arguments の順序を維持する', () => {
    expect(parseCliArgs(['check', '-p', 'tsconfig.json'])).toEqual({
      command: 'check',
      args: ['-p', 'tsconfig.json'],
    });
  });

  it('run entry と module arguments を分離する', () => {
    expect(parseCliArgs(['run', 'app.ts.md', '--answer', '42'])).toEqual({
      command: 'run',
      entry: 'app.ts.md',
      args: ['--answer', '42'],
    });
  });

  it('tangle options と globs を解釈する', () => {
    expect(
      parseCliArgs(['tangle', 'src/**/*.ts.md', '--outDir', 'generated']),
    ).toEqual({
      command: 'tangle',
      globs: ['src/**/*.ts.md'],
      outDir: 'generated',
    });
  });
});

describe('parseEntry', () => {
  it('module 指定がなければ main を使う', () => {
    expect(parseEntry('./app.ts.md')).toEqual({
      documentPath: path.resolve('./app.ts.md'),
      moduleName: 'main',
    });
  });

  it('CLI entry の名前付き module を解釈する', () => {
    expect(parseEntry('./app.ts.md:example')).toEqual({
      documentPath: path.resolve('./app.ts.md'),
      moduleName: 'example',
    });
  });
});

describe('expandGlobs', () => {
  it('一致したファイルを絶対 path で返す', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'globs-'));
    const file = path.join(tmp, 'doc.ts.md');

    try {
      await fs.writeFile(file, '', 'utf8');
      expect(await expandGlobs([`${tmp}/*.ts.md`])).toEqual([file]);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it('複数の pattern を展開する', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'globs-'));
    const first = path.join(tmp, 'first.ts.md');
    const second = path.join(tmp, 'nested', 'second.ts.md');

    try {
      await fs.mkdir(path.dirname(second));
      await Promise.all([
        fs.writeFile(first, '', 'utf8'),
        fs.writeFile(second, '', 'utf8'),
      ]);
      const files = await expandGlobs([
        `${tmp}/*.ts.md`,
        `${tmp}/**/second.ts.md`,
      ]);
      expect(files).toHaveLength(2);
      expect(files).toEqual(expect.arrayContaining([first, second]));
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('spawnNode', () => {
  it('終了 code を返す', async () => {
    expect(await spawnNode(['-e', 'console.log("ok")'])).toBe(0);
  });
});
