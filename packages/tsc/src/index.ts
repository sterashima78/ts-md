#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import fg from 'fast-glob';
import { loadTsConfig } from 'load-tsconfig';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const project = getOption(args, 'p', 'project') ?? 'tsconfig.json';
const outDirArg = getOption(args, '', 'outDir');
const rootDirArg = getOption(args, '', 'rootDir');

const originalExit = process.exit;
process.exit = ((code = 0) => {
  renameDeclarations().then(
    () => originalExit(code),
    () => originalExit(code),
  );
}) as typeof process.exit;

runTsc(
  require.resolve('typescript/lib/tsc'),
  {
    extraSupportedExtensions: ['.ts.md'],
    extraExtensionsToRemove: ['.ts.md'],
  },
  () => ({
    languagePlugins: [createTsMdPlugin],
  }),
);

function getOption(args: string[], short: string, long?: string) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (short && arg === `-${short}`) return args[i + 1];
    if (long && arg === `--${long}`) return args[i + 1];
    const reg = new RegExp(`^(?:-${short}|--${long})(?:=|$)`);
    const m = long ? arg.match(reg) : undefined;
    if (m) return arg.slice(m[0].length);
  }
  return undefined;
}

async function renameDeclarations() {
  const configPath = path.resolve(project);
  const config = loadTsConfig(
    path.dirname(configPath),
    path.basename(configPath),
  );
  const compilerOptions = config?.data.compilerOptions ?? {};
  const rootDir = path.resolve(
    path.dirname(configPath),
    rootDirArg ?? (compilerOptions.rootDir as string | undefined) ?? '.',
  );
  const outDir = path.resolve(
    path.dirname(configPath),
    outDirArg ?? (compilerOptions.outDir as string | undefined) ?? 'dist',
  );
  const files = await fg('**/*.ts.md', { cwd: rootDir });
  await Promise.all(
    files.map(async (rel) => {
      const base = rel.slice(0, -'.ts.md'.length);
      const from = path.join(outDir, `${base}.d.ts`);
      const to = path.join(outDir, `${base}.ts.md.d.ts`);
      try {
        await fs.rename(from, to);
      } catch {}
    }),
  );
}
