#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import { runTsc } from '@volar/typescript/lib/quickstart/runTsc.js';
import ts from 'typescript';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const projectIdx = args.findIndex((a) => a === '-p' || a === '--project');
const tsconfigPath =
  projectIdx >= 0
    ? path.resolve(args[projectIdx + 1])
    : path.resolve('tsconfig.json');

let outDir = path.join(path.dirname(tsconfigPath), 'dist');
try {
  const raw = ts.readConfigFile(tsconfigPath, ts.sys.readFile).config;
  const parsed = ts.parseJsonConfigFileContent(
    raw,
    ts.sys,
    path.dirname(tsconfigPath),
  );
  if (parsed.options.outDir) outDir = parsed.options.outDir;
} catch {
  // noop
}
const outDirArgIndex = args.findIndex((a) => a === '--outDir');
if (outDirArgIndex >= 0) {
  const v = args[outDirArgIndex + 1];
  if (v) outDir = path.resolve(v);
} else {
  const prefixed = args.find((a) => a.startsWith('--outDir='));
  if (prefixed) {
    const v = prefixed.slice('--outDir='.length);
    if (v) outDir = path.resolve(v);
  }
}

process.on('exit', () => renameDts(outDir, path.dirname(tsconfigPath)));

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

function renameDts(outDir: string, configDir: string) {
  if (!fs.existsSync(outDir)) return;
  const stack = [outDir];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
        continue;
      }
      if (!entry.isFile() || !p.endsWith('.d.ts')) continue;
      const rel = path.relative(outDir, p);
      const base = rel.replace(/\.d\.ts$/, '.ts.md');
      const candidates = [
        path.join(configDir, base),
        path.join(configDir, 'src', base),
      ];
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          const dest = p.replace(/\.d\.ts$/, '.ts.md.d.ts');
          fs.renameSync(p, dest);
          break;
        }
      }
    }
  }
}
