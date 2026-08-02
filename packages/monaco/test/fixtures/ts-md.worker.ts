import {
  createTsMdEditorPlugin,
  resolveTsMdFileName,
} from '@sterashima78/ts-md-ls-core';
import type {
  LanguagePlugin,
  LanguageServiceEnvironment,
  ProjectContext,
} from '@volar/language-service';
import { createTypeScriptWorkerLanguageService } from '@volar/monaco/worker';
import type * as monaco from 'monaco-editor';
import * as editorWorker from 'monaco-editor/editor/editor.worker';
import ts from 'typescript';
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript';
import type { URI } from 'vscode-uri';
import { URI as Uri } from 'vscode-uri';

const rawTypeScriptLibraries = import.meta.glob(
  '../../node_modules/typescript/lib/lib.*.d.ts',
  {
    eager: true,
    import: 'default',
    query: '?raw',
  },
) as Record<string, string>;

const defaultTypeScriptLibraryFileName = '/lib.es2022.full.d.ts';
const defaultTypeScriptLibrarySource = Object.entries(rawTypeScriptLibraries)
  .filter(([path]) => isIncludedLibrary(path))
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, source]) => stripReferenceDirectives(source))
  .join('\n');
const defaultTypeScriptLibrarySnapshot = ts.ScriptSnapshot.fromString(
  defaultTypeScriptLibrarySource,
);

self.onmessage = () => {
  editorWorker.initialize((workerContext: monaco.worker.IWorkerContext) => {
    const env: LanguageServiceEnvironment = {
      workspaceFolders: [Uri.parse('file:///')],
    };

    return createTypeScriptWorkerLanguageService({
      typescript: ts,
      compilerOptions: {
        allowNonTsExtensions: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
      },
      env,
      uriConverter: {
        asFileName: (uri) => uri.fsPath,
        asUri: (fileName) => Uri.file(fileName),
      },
      workerContext,
      languagePlugins: [
        createTsMdEditorPlugin as unknown as LanguagePlugin<URI>,
      ],
      languageServicePlugins: createTypeScriptServicePlugins(ts),
      setup({ project }) {
        installTypeScriptLibraries(project);
        installTsMdModuleResolver(project);
      },
    });
  });
};

function installTypeScriptLibraries(project: ProjectContext) {
  const host = project.typescript?.languageServiceHost;
  if (!host) return;

  const fallbackGetScriptFileNames = host.getScriptFileNames.bind(host);
  const fallbackGetScriptSnapshot = host.getScriptSnapshot.bind(host);
  const fallbackGetScriptVersion = host.getScriptVersion?.bind(host);
  const fallbackFileExists = host.fileExists?.bind(host);
  const fallbackReadFile = host.readFile?.bind(host);

  host.getDefaultLibFileName = () => defaultTypeScriptLibraryFileName;
  host.getScriptFileNames = () => [
    ...fallbackGetScriptFileNames(),
    defaultTypeScriptLibraryFileName,
  ];
  host.getScriptSnapshot = (fileName) =>
    isDefaultTypeScriptLibrary(fileName)
      ? defaultTypeScriptLibrarySnapshot
      : fallbackGetScriptSnapshot(fileName);
  host.getScriptVersion = (fileName) =>
    isDefaultTypeScriptLibrary(fileName)
      ? '0'
      : (fallbackGetScriptVersion?.(fileName) ?? '0');
  host.fileExists = (fileName) =>
    isDefaultTypeScriptLibrary(fileName) ||
    (fallbackFileExists?.(fileName) ?? false);
  host.readFile = (fileName) =>
    isDefaultTypeScriptLibrary(fileName)
      ? defaultTypeScriptLibrarySource
      : fallbackReadFile?.(fileName);
}

function installTsMdModuleResolver(project: ProjectContext) {
  const host = project.typescript?.languageServiceHost;
  if (!host) return;

  const fallbackLiterals = host.resolveModuleNameLiterals?.bind(host);
  const resolveModuleNameLiterals: NonNullable<
    ts.LanguageServiceHost['resolveModuleNameLiterals']
  > = (...args) => {
    const [moduleLiterals, containingFile] = args;
    const fallbackResults = fallbackLiterals?.(...args);
    return moduleLiterals.map((literal, index) => {
      const resolvedModule = resolveTsMdModule(literal.text, containingFile);
      return resolvedModule
        ? { resolvedModule }
        : (fallbackResults?.[index] ?? { resolvedModule: undefined });
    });
  };
  host.resolveModuleNameLiterals = resolveModuleNameLiterals;

  const fallbackNames = host.resolveModuleNames?.bind(host);
  const resolveModuleNames: NonNullable<
    ts.LanguageServiceHost['resolveModuleNames']
  > = (...args) => {
    const [moduleNames, containingFile] = args;
    const fallbackResults = fallbackNames?.(...args);
    return moduleNames.map(
      (moduleName, index) =>
        resolveTsMdModule(moduleName, containingFile) ?? fallbackResults?.[index],
    );
  };
  host.resolveModuleNames = resolveModuleNames;
}

function resolveTsMdModule(
  specifier: string,
  containingFile: string,
): ts.ResolvedModuleFull | undefined {
  const resolvedFileName = resolveTsMdFileName(specifier, containingFile);
  if (!resolvedFileName) return;

  return {
    resolvedFileName,
    extension: ts.Extension.Ts,
    isExternalLibraryImport: false,
  };
}

function isDefaultTypeScriptLibrary(fileName: string) {
  return normalizeFileName(fileName) === defaultTypeScriptLibraryFileName;
}

function normalizeFileName(fileName: string) {
  const normalized = fileName.replaceAll('\\', '/');
  return `/${normalized.slice(normalized.lastIndexOf('/') + 1)}`;
}

function isIncludedLibrary(path: string) {
  const fileName = normalizeFileName(path).slice(1);
  if (
    fileName === 'lib.dom.d.ts' ||
    fileName === 'lib.dom.iterable.d.ts' ||
    fileName === 'lib.dom.asynciterable.d.ts' ||
    fileName === 'lib.scripthost.d.ts' ||
    fileName === 'lib.decorators.d.ts' ||
    fileName === 'lib.decorators.legacy.d.ts'
  ) {
    return true;
  }

  const match = /^lib\.es(\d+)(?:\..+)?\.d\.ts$/.exec(fileName);
  return match ? Number(match[1]) <= 2022 : false;
}

function stripReferenceDirectives(source: string) {
  return source.replace(/^\/\/\/\s*<reference\b[^>]*\/>\s*$/gm, '');
}
