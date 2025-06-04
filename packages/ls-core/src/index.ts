import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { type Chunk, collectVirtualFiles, resolveImport } from '../../core/src';

export interface VirtualFile {
  fileName: string;
  code: string;
}

export interface EmbeddedLanguagePlugin {
  createProgram(entry: string, options?: ts.CompilerOptions): ts.Program;
}

function toVirtualFileName(chunk: Chunk): string {
  const base = path.resolve(chunk.file).replace(/[:\\]/g, '_');
  return `${base}___${chunk.name}.ts`;
}

export function createTsMdPlugin(): EmbeddedLanguagePlugin {
  return {
    createProgram(entry: string, options: ts.CompilerOptions = {}): ts.Program {
      const files = collectVirtualFiles(entry);
      const virtualFiles = new Map<string, string>();
      const reverse = new Map<string, Chunk>();
      for (const chunk of Object.values(files)) {
        const vName = toVirtualFileName(chunk);
        virtualFiles.set(vName, chunk.code);
        reverse.set(vName, chunk);
      }
      const compilerOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ESNext,
        skipLibCheck: true,
        ...options,
      };
      const host = ts.createCompilerHost(compilerOptions);
      const defaultResolveModuleNames = host.resolveModuleNames?.bind(host);
      host.resolveModuleNames = (moduleNames, containingFile, ...rest) => {
        const results: (ts.ResolvedModule | undefined)[] = [];
        for (const name of moduleNames) {
          if (name.startsWith('#')) {
            const original =
              reverse.get(containingFile)?.file ?? containingFile;
            const info = resolveImport(name, original);
            if (info) {
              const base = path.resolve(info.file).replace(/[:\\]/g, '_');
              const fn = `${base}___${info.name}.ts`;
              results.push({
                resolvedFileName: fn,
                extension: ts.Extension.Ts,
              } as ts.ResolvedModuleFull);
              continue;
            }
          }
          if (defaultResolveModuleNames) {
            const resolved = defaultResolveModuleNames(
              [name],
              containingFile,
              ...rest,
            )[0];
            results.push(resolved);
          } else {
            const resolved = ts.resolveModuleName(
              name,
              containingFile,
              compilerOptions,
              host,
            ).resolvedModule;
            results.push(resolved);
          }
        }
        return results;
      };
      host.fileExists = (fileName: string) => {
        return virtualFiles.has(fileName) || ts.sys.fileExists(fileName);
      };
      host.readFile = (fileName: string) => {
        return virtualFiles.get(fileName) ?? ts.sys.readFile(fileName);
      };
      host.getSourceFile = (fileName, languageVersion) => {
        const content = virtualFiles.get(fileName);
        if (content !== undefined) {
          return ts.createSourceFile(fileName, content, languageVersion, true);
        }
        const text = ts.sys.readFile(fileName);
        if (text === undefined) return undefined;
        return ts.createSourceFile(fileName, text, languageVersion, true);
      };
      return ts.createProgram(
        Array.from(virtualFiles.keys()),
        compilerOptions,
        host,
      );
    },
  };
}
