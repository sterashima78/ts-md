import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseChunks, resolveImport } from '@sterashima78/ts-md-core';
import ts from 'typescript';

type Resolve = (
  specifier: string,
  context: { parentURL?: string | undefined },
  defaultResolve: Resolve,
) => Promise<{ url: string }>;

type Load = (
  url: string,
  context: { format?: string | undefined },
  defaultLoad: Load,
) => Promise<{ format: string; source: string }>;

const VIRTUAL_PREFIX = 'ts-md:';

export const resolve: Resolve = async (specifier, context, defaultResolve) => {
  const parentURL = context.parentURL
    ? fileURLToPath(context.parentURL)
    : undefined;
  const specPath = specifier.startsWith('file:')
    ? fileURLToPath(specifier)
    : specifier;
  if (specifier.startsWith('#') && parentURL) {
    const info = resolveImport(specifier, parentURL);
    if (info) {
      const abs = path.resolve(info.file);
      const url = `${VIRTUAL_PREFIX}${abs}:${info.name}`;
      return { url, format: 'module', shortCircuit: true };
    }
  }

  if (specPath.endsWith('.ts.md')) {
    const abs = parentURL
      ? path.resolve(path.dirname(parentURL), specPath)
      : path.resolve(specPath);
    return {
      url: `${VIRTUAL_PREFIX}${abs}:main`,
      format: 'module',
      shortCircuit: true,
    };
  }

  if (specPath.endsWith('.ts')) {
    const abs = parentURL
      ? path.resolve(path.dirname(parentURL), specPath)
      : path.resolve(specPath);
    return {
      url: pathToFileURL(abs).href,
      format: 'module',
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
};

export const load: Load = async (url, context, defaultLoad) => {
  if (url.startsWith(VIRTUAL_PREFIX)) {
    const body = url.slice(VIRTUAL_PREFIX.length);
    const idx = body.lastIndexOf(':');
    const file = body.slice(0, idx);
    const name = body.slice(idx + 1);
    const md = fs.readFileSync(file, 'utf8');
    const chunks = parseChunks(md, file);
    const chunk = chunks[name];
    if (!chunk) {
      throw new Error(`chunk '${name}' not found in ${file}`);
    }
    const tsResult = ts.transpileModule(chunk.code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        sourceMap: false,
      },
    });
    return {
      format: 'module',
      source: tsResult.outputText,
      shortCircuit: true,
    };
  }

  if (url.startsWith('file:') && url.endsWith('.ts')) {
    const file = fileURLToPath(url);
    const source = fs.readFileSync(file, 'utf8');
    const tsResult = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        sourceMap: false,
      },
    });
    return {
      format: 'module',
      source: tsResult.outputText,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
};
