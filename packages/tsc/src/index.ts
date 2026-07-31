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

interface PendingWrite {
  fileName: string;
  data: string;
  writeByteOrderMark: boolean;
  onError?: (message: string) => void;
  sourceFiles?: readonly ts.SourceFile[];
}

interface OutputIndex {
  renamedFileNames: Map<string, string>;
  declarationBySource: Map<string, string>;
  runtimeBySource: Map<string, string>;
}

const extraFileExtensions: ts.FileExtensionInfo[] = [
  {
    extension: '.ts.md',
    isMixedContent: true,
    scriptKind: ts.ScriptKind.Deferred,
  },
];

const DECLARATION_OUTPUT_PATTERN = /\.d\.(?:ts|mts|cts)$/;
const RUNTIME_OUTPUT_PATTERN = /\.(?:js|jsx|mjs|cjs)$/;

function normalize(fileName: string) {
  return path.normalize(path.resolve(fileName));
}

function extractProjectArgument(args: string[]) {
  let project: string | undefined;
  const compilerArgs: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '-p' || argument === '--project') {
      const value = args[index + 1];
      if (!value) {
        compilerArgs.push(argument);
        continue;
      }
      project = value;
      index++;
      continue;
    }
    if (argument.startsWith('--project=')) {
      const value = argument.slice('--project='.length);
      if (!value) {
        compilerArgs.push(argument);
        continue;
      }
      project = value;
      continue;
    }
    compilerArgs.push(argument);
  }

  return { project, compilerArgs };
}

function resolveConfigPath(project: string) {
  const candidate = normalize(project);
  return ts.sys.directoryExists?.(candidate)
    ? path.join(candidate, 'tsconfig.json')
    : candidate;
}

function parseConfiguration(args: string[]): ts.ParsedCommandLine {
  const { project, compilerArgs } = extractProjectArgument(args);
  const commandLine = ts.parseCommandLine(compilerArgs);
  if (commandLine.errors.length) {
    printDiagnostics(commandLine.errors);
    process.exit(1);
  }

  const configPath = project
    ? resolveConfigPath(project)
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

  const suffix = fileName.slice(
    markerIndex + TS_MD_VIRTUAL_MODULE_MARKER.length,
  );
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

function createOutputIndex(writes: readonly PendingWrite[]): OutputIndex {
  const renamedFileNames = new Map<string, string>();
  const declarationBySource = new Map<string, string>();
  const runtimeBySource = new Map<string, string>();

  for (const write of writes) {
    const inputFileName = normalize(write.fileName);
    const outputFileName = normalize(rewriteOutputFileName(inputFileName));
    renamedFileNames.set(inputFileName, outputFileName);

    for (const sourceFile of write.sourceFiles ?? []) {
      const sourceFileName = normalize(sourceFile.fileName);
      if (DECLARATION_OUTPUT_PATTERN.test(inputFileName)) {
        declarationBySource.set(sourceFileName, outputFileName);
      } else if (RUNTIME_OUTPUT_PATTERN.test(inputFileName)) {
        runtimeBySource.set(sourceFileName, outputFileName);
      }
    }
  }

  return { renamedFileNames, declarationBySource, runtimeBySource };
}

function toRelativeModuleSpecifier(fromFile: string, targetFile: string) {
  let relative = path
    .relative(path.dirname(fromFile), targetFile)
    .split(path.sep)
    .join('/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function runtimeOutputFromDeclaration(
  declarationFileName: string,
  module: TsMdModule,
  options: ts.CompilerOptions,
) {
  if (declarationFileName.endsWith('.d.mts')) {
    return `${declarationFileName.slice(0, -'.d.mts'.length)}.mjs`;
  }
  if (declarationFileName.endsWith('.d.cts')) {
    return `${declarationFileName.slice(0, -'.d.cts'.length)}.cjs`;
  }
  const extension =
    module.language === 'tsx' && options.jsx === ts.JsxEmit.Preserve
      ? '.jsx'
      : '.js';
  return declarationFileName.slice(0, -'.d.ts'.length) + extension;
}

function isModuleSpecifierLiteral(node: ts.StringLiteral) {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent)) return parent.moduleSpecifier === node;
  if (ts.isExportDeclaration(parent)) return parent.moduleSpecifier === node;
  if (ts.isExternalModuleReference(parent)) return parent.expression === node;
  if (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent)) {
    return true;
  }
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    parent.expression.kind === ts.SyntaxKind.ImportKeyword
  );
}

function rewriteModuleSpecifiers(
  data: string,
  sourceFileName: string,
  outputFileName: string,
  options: ts.CompilerOptions,
  store: ReturnType<typeof createDocumentStore>,
  outputs: OutputIndex,
) {
  const scriptKind = outputFileName.endsWith('.jsx')
    ? ts.ScriptKind.JSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    outputFileName,
    data,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node) && isModuleSpecifierLiteral(node)) {
      const resolved = resolveImport(node.text, sourceFileName);
      if (resolved) {
        const targetSourceFileName = normalize(
          createVirtualModuleFileName({
            documentPath: resolved.absPath,
            moduleName: resolved.chunk,
          }),
        );
        const targetModule = store.getVirtualModule(targetSourceFileName);
        const targetRuntimeOutput =
          outputs.runtimeBySource.get(targetSourceFileName) ??
          (() => {
            const declarationOutput =
              outputs.declarationBySource.get(targetSourceFileName);
            if (!declarationOutput || !targetModule) return;
            return runtimeOutputFromDeclaration(
              declarationOutput,
              targetModule.module,
              options,
            );
          })();

        if (targetRuntimeOutput) {
          const quote = data[node.getStart(sourceFile)];
          const specifier = toRelativeModuleSpecifier(
            outputFileName,
            targetRuntimeOutput,
          ).replaceAll(quote, `\\${quote}`);
          replacements.push({
            start: node.getStart(sourceFile) + 1,
            end: node.getEnd() - 1,
            text: specifier,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  let result = data;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    result =
      result.slice(0, replacement.start) +
      replacement.text +
      result.slice(replacement.end);
  }
  return result;
}

function rewriteSourceMapReferences(
  data: string,
  inputFileName: string,
  outputFileName: string,
  outputs: OutputIndex,
) {
  if (inputFileName.endsWith('.map')) {
    try {
      const map = JSON.parse(data) as { file?: unknown };
      if (typeof map.file === 'string') {
        const referencedInput = normalize(
          path.resolve(path.dirname(inputFileName), map.file),
        );
        const referencedOutput =
          outputs.renamedFileNames.get(referencedInput) ??
          normalize(rewriteOutputFileName(referencedInput));
        map.file = path
          .relative(path.dirname(outputFileName), referencedOutput)
          .split(path.sep)
          .join('/');
      }
      return JSON.stringify(map);
    } catch {
      return data;
    }
  }

  return data.replace(
    /([#@]\s*sourceMappingURL=)([^\r\n]+)/g,
    (match, prefix: string, sourceMapUrl: string) => {
      if (/^(?:data:|[a-z]+:)/i.test(sourceMapUrl)) return match;
      const referencedInput = normalize(
        path.resolve(path.dirname(inputFileName), sourceMapUrl),
      );
      const referencedOutput =
        outputs.renamedFileNames.get(referencedInput) ??
        normalize(rewriteOutputFileName(referencedInput));
      const relative = path
        .relative(path.dirname(outputFileName), referencedOutput)
        .split(path.sep)
        .join('/');
      return `${prefix}${relative}`;
    },
  );
}

function createTsMdCompilerHost(
  options: ts.CompilerOptions,
  store: ReturnType<typeof createDocumentStore>,
) {
  const host = ts.createCompilerHost(options);
  const originalFileExists = host.fileExists.bind(host);
  const originalReadFile = host.readFile.bind(host);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalWriteFile = host.writeFile.bind(host);
  const pendingWrites: PendingWrite[] = [];

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
        } as ts.ResolvedModuleFull;
      }

      return ts.resolveModuleName(
        moduleName,
        containingFile,
        options,
        resolutionHost,
      ).resolvedModule;
    });

  host.writeFile = (
    fileName,
    data,
    writeByteOrderMark,
    onError,
    sourceFiles,
  ) => {
    pendingWrites.push({
      fileName,
      data,
      writeByteOrderMark,
      onError,
      sourceFiles,
    });
  };

  function flushWrites() {
    const outputs = createOutputIndex(pendingWrites);
    for (const write of pendingWrites) {
      const inputFileName = normalize(write.fileName);
      const outputFileName =
        outputs.renamedFileNames.get(inputFileName) ?? inputFileName;
      let data = write.data;
      const sourceFile =
        write.sourceFiles?.length === 1 ? write.sourceFiles[0] : undefined;
      if (
        sourceFile &&
        (DECLARATION_OUTPUT_PATTERN.test(inputFileName) ||
          RUNTIME_OUTPUT_PATTERN.test(inputFileName))
      ) {
        data = rewriteModuleSpecifiers(
          data,
          normalize(sourceFile.fileName),
          outputFileName,
          options,
          store,
          outputs,
        );
      }
      data = rewriteSourceMapReferences(
        data,
        inputFileName,
        outputFileName,
        outputs,
      );
      originalWriteFile(
        outputFileName,
        data,
        write.writeByteOrderMark,
        write.onError,
        write.sourceFiles,
      );
    }
    pendingWrites.length = 0;
  }

  return { flushWrites, host };
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
  const compiler = createTsMdCompilerHost(configuration.options, store);
  const program = ts.createProgram({
    rootNames,
    options: configuration.options,
    projectReferences: configuration.projectReferences,
    host: compiler.host,
  });

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => mapDiagnostic(diagnostic, store));
  const emitResult = configuration.options.noEmit ? undefined : program.emit();
  compiler.flushWrites();
  const emitDiagnostics =
    emitResult?.diagnostics.map((diagnostic) =>
      mapDiagnostic(diagnostic, store),
    ) ?? [];
  const allDiagnostics = [...diagnostics, ...emitDiagnostics];

  if (allDiagnostics.length) printDiagnostics(allDiagnostics);
  return allDiagnostics.some(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  )
    ? 1
    : 0;
}

process.exitCode = runTsMdTsc(process.argv.slice(2));
