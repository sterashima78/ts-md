#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  createVirtualModuleFileName,
  parseDocument,
  parseVirtualModuleFileName,
  resolveImport,
  TS_MD_VIRTUAL_MODULE_MARKER,
  type TsMdDocument,
  type TsMdModule,
} from '@sterashima78/ts-md-ls-core';
import ts from 'typescript';

interface VirtualModule {
  document: TsMdDocument;
  module: TsMdModule;
  fileName: string;
}

const extraFileExtensions: ts.FileExtensionInfo[] = [
  {
    extension: '.ts.md',
    isMixedContent: true,
    scriptKind: ts.ScriptKind.Deferred,
  },
];

function normalize(fileName: string) {
  return path.normalize(path.resolve(fileName));
}

function extractProjectArgument(args: string[]) {
  let project: string | undefined;
  const compilerArgs: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '-p' || argument === '--project') {
      project = args[++index];
      continue;
    }
    if (argument.startsWith('--project=')) {
      project = argument.slice('--project='.length);
      continue;
    }
    compilerArgs.push(argument);
  }

  return { project, compilerArgs };
}

function parseConfiguration(args: string[]): ts.ParsedCommandLine {
  const { project, compilerArgs } = extractProjectArgument(args);
  const commandLine = ts.parseCommandLine(compilerArgs);
  if (commandLine.errors.length) {
    printDiagnostics(commandLine.errors);
    process.exit(1);
  }

  const configPath = project
    ? normalize(project)
    : ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');

  if (!configPath) return commandLine;

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    printDiagnostics([config.error]);
    process.exit(1);
  }

  return ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
    commandLine.options,
    configPath,
    undefined,
    extraFileExtensions,
  );
}

function createDocumentStore() {
  const documents = new Map<string, TsMdDocument>();
  const virtualModules = new Map<string, VirtualModule>();

  function loadDocument(fileName: string): TsMdDocument | undefined {
    const documentPath = normalize(fileName);
    const cached = documents.get(documentPath);
    if (cached) return cached;
    if (!ts.sys.fileExists(documentPath)) return;

    const markdown = ts.sys.readFile(documentPath);
    if (markdown === undefined) return;
    const document = parseDocument(markdown, documentPath);
    documents.set(documentPath, document);

    for (const module of document.modules) {
      const virtualFileName = normalize(
        createVirtualModuleFileName({
          documentPath,
          moduleName: module.name,
        }),
      );
      virtualModules.set(virtualFileName, {
        document,
        module,
        fileName: virtualFileName,
      });
    }

    return document;
  }

  function getVirtualModule(fileName: string): VirtualModule | undefined {
    const normalized = normalize(fileName);
    const cached = virtualModules.get(normalized);
    if (cached) return cached;

    const id = parseVirtualModuleFileName(normalized);
    if (!id) return;
    loadDocument(id.documentPath);
    return virtualModules.get(normalized);
  }

  function getRootFileNames(fileNames: string[]) {
    const roots: string[] = [];
    for (const fileName of fileNames) {
      if (!fileName.endsWith('.ts.md')) {
        roots.push(fileName);
        continue;
      }
      const document = loadDocument(fileName);
      if (!document) continue;
      for (const module of document.modules) {
        roots.push(
          createVirtualModuleFileName({
            documentPath: document.uri,
            moduleName: module.name,
          }),
        );
      }
    }
    return roots;
  }

  return {
    documents,
    getRootFileNames,
    getVirtualModule,
    loadDocument,
  };
}

function rewriteOutputFileName(fileName: string) {
  const markerIndex = fileName.lastIndexOf(TS_MD_VIRTUAL_MODULE_MARKER);
  if (markerIndex === -1) return fileName;

  const suffix = fileName.slice(markerIndex + TS_MD_VIRTUAL_MODULE_MARKER.length);
  const extensionIndex = suffix.indexOf('.');
  if (extensionIndex === -1) return fileName;

  const encodedModuleName = suffix.slice(0, extensionIndex);
  const outputExtension = suffix.slice(extensionIndex);
  let moduleName: string;
  try {
    moduleName = decodeURIComponent(encodedModuleName);
  } catch {
    return fileName;
  }

  if (moduleName === 'main') {
    return `${fileName.slice(0, markerIndex)}${outputExtension}`;
  }
  return fileName;
}

function createTsMdCompilerHost(
  options: ts.CompilerOptions,
  store: ReturnType<typeof createDocumentStore>,
): ts.CompilerHost {
  const host = ts.createCompilerHost(options);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalWriteFile = host.writeFile.bind(host);

  host.fileExists = (fileName) =>
    Boolean(store.getVirtualModule(fileName)) || originalFileExists(fileName);

  host.readFile = (fileName) =>
    store.getVirtualModule(fileName)?.module.code ?? originalReadFile(fileName);

  host.getSourceFile = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) => {
    const virtualModule = store.getVirtualModule(fileName);
    if (!virtualModule) {
      return originalGetSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    }

    return ts.createSourceFile(
      virtualModule.fileName,
      virtualModule.module.code,
      languageVersion,
      true,
      virtualModule.module.language === 'tsx'
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS,
    );
  };

  const resolutionHost: ts.ModuleResolutionHost = {
    directoryExists: ts.sys.directoryExists,
    fileExists: host.fileExists,
    getCurrentDirectory: host.getCurrentDirectory,
    getDirectories: ts.sys.getDirectories,
    readFile: host.readFile,
    realpath: ts.sys.realpath,
  };

  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      const resolvedTsMdImport = resolveImport(moduleName, containingFile);
      if (resolvedTsMdImport) {
        const document = store.loadDocument(resolvedTsMdImport.absPath);
        const module = document?.modules.find(
          (candidate) => candidate.name === resolvedTsMdImport.chunk,
        );
        if (!module) return undefined;
        return {
          resolvedFileName: createVirtualModuleFileName({
            documentPath: resolvedTsMdImport.absPath,
            moduleName: resolvedTsMdImport.chunk,
          }),
          extension:
            module.language === 'tsx' ? ts.Extension.Tsx : ts.Extension.Ts,
          isExternalLibraryImport: false,
        } satisfies ts.ResolvedModule;
      }

      return ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        resolutionHost,
      ).resolvedModule;
    });

  host.writeFile = (fileName, data, ...rest) =>
    originalWriteFile(rewriteOutputFileName(fileName), data, ...rest);

  return host;
}

function mapDiagnostic(
  diagnostic: ts.Diagnostic,
  store: ReturnType<typeof createDocumentStore>,
): ts.Diagnostic {
  if (!diagnostic.file) return diagnostic;
  const virtualModule = store.getVirtualModule(diagnostic.file.fileName);
  if (!virtualModule) return diagnostic;

  const markdown = fs.readFileSync(virtualModule.document.uri, 'utf8');
  const sourceFile = ts.createSourceFile(
    virtualModule.document.uri,
    markdown,
    diagnostic.file.languageVersion,
    true,
    ts.ScriptKind.Unknown,
  );
  return {
    ...diagnostic,
    file: sourceFile,
    start:
      diagnostic.start === undefined
        ? undefined
        : virtualModule.module.start + diagnostic.start,
  };
}

function printDiagnostics(diagnostics: readonly ts.Diagnostic[]) {
  const host: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  };
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
}

export function runTsMdTsc(args: string[]) {
  const configuration = parseConfiguration(args);
  if (configuration.errors.length) {
    printDiagnostics(configuration.errors);
    return 1;
  }

  const store = createDocumentStore();
  const rootNames = store.getRootFileNames(configuration.fileNames);
  const host = createTsMdCompilerHost(configuration.options, store);
  const program = ts.createProgram({
    rootNames,
    options: configuration.options,
    projectReferences: configuration.projectReferences,
    host,
  });

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => mapDiagnostic(diagnostic, store));
  const emitResult = configuration.options.noEmit
    ? undefined
    : program.emit();
  const emitDiagnostics =
    emitResult?.diagnostics.map((diagnostic) => mapDiagnostic(diagnostic, store)) ??
    [];
  const allDiagnostics = [...diagnostics, ...emitDiagnostics];

  if (allDiagnostics.length) printDiagnostics(allDiagnostics);
  return allDiagnostics.some(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  )
    ? 1
    : 0;
}

process.exitCode = runTsMdTsc(process.argv.slice(2));
