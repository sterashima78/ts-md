import {
  createTsMdEditorPlugin,
  resolveTsMdFileName,
} from '@sterashima78/ts-md-ls-core';
import { provider as fileSystemProvider } from '@volar/language-server/lib/fileSystemProviders/node';
import { createTypeScriptProject } from '@volar/language-server/lib/project/typescriptProject';
import { createServerBase } from '@volar/language-server/lib/server';
import {
  createConnection,
  type ExperimentalFeatures,
  type ServerCapabilities,
  TextDocumentSyncKind,
} from '@volar/language-server/node';
import type { LanguagePlugin, ProjectContext } from '@volar/language-service';
import ts from 'typescript';
import { create as createTypeScriptServicePlugins } from 'volar-service-typescript';
import type { URI } from 'vscode-uri';

const connection = createConnection();
const server = createServerBase(connection, { timer: { setImmediate } });
server.fileSystem.install('file', fileSystemProvider);

server.onInitialize(
  (serverCapabilities: ServerCapabilities<ExperimentalFeatures>) => {
    serverCapabilities.textDocumentSync = TextDocumentSyncKind.Incremental;
  },
);

connection.onInitialize((params) =>
  server.initialize(
    params,
    createTypeScriptProject(ts, undefined, () => ({
      languagePlugins: [
        createTsMdEditorPlugin as unknown as LanguagePlugin<URI>,
      ],
      setup({ project }) {
        installTsMdModuleResolver(project);
      },
    })),
    createTypeScriptServicePlugins(ts),
  ),
);
connection.onInitialized(() => server.initialized());
connection.onShutdown(() => server.shutdown());

connection.listen();

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
        resolveTsMdModule(moduleName, containingFile) ??
        fallbackResults?.[index],
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
