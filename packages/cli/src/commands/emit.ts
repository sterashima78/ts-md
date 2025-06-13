import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parseChunks, resolveImport } from '@sterashima78/ts-md-core';
import ts from 'typescript';
import { expandGlobs } from '../utils/globs';

export async function runEmit(inputGlobs: string[], outDir = 'dist') {
  const files = await expandGlobs(inputGlobs);
  await fsp.mkdir(outDir, { recursive: true });

  for (const file of files) {
    const md = await fsp.readFile(file, 'utf8');
    const dict = parseChunks(md, file);

    for (const [chunk, code] of Object.entries(dict)) {
      await emitChunk(file, chunk, code, outDir);
    }
  }
}

async function emitChunk(
  file: string,
  chunk: string,
  code: string,
  outDir: string,
) {
  const name = `${file}:${chunk}.ts`;
  const options: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    module: ts.ModuleKind.CommonJS,
  };
  const cache: Record<string, Record<string, string>> = {};
  const host = ts.createCompilerHost(options);
  function getChunkCode(p: string, c: string) {
    if (!cache[p]) {
      const mdText = fs.readFileSync(p, 'utf8');
      cache[p] = parseChunks(mdText, p);
    }
    return cache[p][c];
  }
  host.getSourceFile = (f, l) => {
    if (f === name) return ts.createSourceFile(f, code, l);
    const m = /(.+\.ts\.md):(.+)\.ts$/.exec(f);
    if (m) {
      const chunkCode = getChunkCode(m[1], m[2]);
      if (chunkCode) return ts.createSourceFile(f, chunkCode, l);
    }
    return ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), l);
  };
  host.readFile = (f) => {
    if (f === name) return code;
    const m = /(.+\.ts\.md):(.+)\.ts$/.exec(f);
    if (m) {
      const chunkCode = getChunkCode(m[1], m[2]);
      if (chunkCode) return chunkCode;
    }
    return fs.readFileSync(f, 'utf8');
  };
  host.fileExists = (f) => {
    if (f === name) return true;
    const m = /(.+\.ts\.md):(.+)\.ts$/.exec(f);
    if (m) {
      const chunkCode = getChunkCode(m[1], m[2]);
      return chunkCode !== undefined;
    }
    return fs.existsSync(f);
  };
  host.resolveModuleNames = (mods, containing) =>
    mods.map((n) => {
      const info = resolveImport(n, file);
      if (info) {
        return {
          resolvedFileName: `${info.absPath}:${info.chunk}.ts`,
          extension: ts.Extension.Ts,
        } as ts.ResolvedModule;
      }
      const res = ts.resolveModuleName(
        n,
        containing,
        options,
        host,
      ).resolvedModule;
      return res as ts.ResolvedModule;
    });
  host.writeFile = (fileName, text) => {
    const rel = path.join(path.basename(file, '.ts.md'), `${chunk}.d.ts`);
    const target = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, 'utf8');
    console.log(`✨ emitted ${target}`);
  };
  const program = ts.createProgram([name], options, host);
  program.emit();
}
