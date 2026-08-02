# Hosting TS-MD in Volar

The language server combines Volar's TypeScript project with the TS-MD language plugin. Initialization installs the Node file-system provider, advertises incremental synchronization, and creates TypeScript service plugins once for the connection.

TS-MD imports require one additional boundary. Volar exposes the generated service scripts, while TypeScript still asks its language-service host to resolve module specifiers. The resolver hooks intercept only TS-MD specifiers and preserve the host's fallback behavior for every ordinary import.

```ts main
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

type ResolveTsMdFileName = (
  specifier: string,
  fromFile: unknown,
) => string | undefined;

async function start() {
  const { createTsMdEditorPlugin, resolveTsMdFileName } = await import(
    '@sterashima78/ts-md-ls-core'
  );
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
          installTsMdModuleResolver(project, resolveTsMdFileName);
        },
      })),
      createTypeScriptServicePlugins(ts),
    ),
  );
  connection.onInitialized(() => server.initialized());
  connection.onShutdown(() => server.shutdown());

  connection.listen();
}

void start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function installTsMdModuleResolver(
  project: ProjectContext,
  resolveFileName: ResolveTsMdFileName,
) {
  const host = project.typescript?.languageServiceHost;
  if (!host) return;

  const fallbackLiterals = host.resolveModuleNameLiterals?.bind(host);
  const resolveModuleNameLiterals: NonNullable<
    ts.LanguageServiceHost['resolveModuleNameLiterals']
  > = (...args) => {
    const [moduleLiterals, containingFile] = args;
    const fallbackResults = fallbackLiterals?.(...args);
    return moduleLiterals.map((literal, index) => {
      const resolvedModule = resolveTsMdModule(
        literal.text,
        containingFile,
        resolveFileName,
      );
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
        resolveTsMdModule(moduleName, containingFile, resolveFileName) ??
        fallbackResults?.[index],
    );
  };
  host.resolveModuleNames = resolveModuleNames;
}

function resolveTsMdModule(
  specifier: string,
  containingFile: string,
  resolveFileName: ResolveTsMdFileName,
): ts.ResolvedModuleFull | undefined {
  const resolvedFileName = resolveFileName(specifier, containingFile);
  if (!resolvedFileName) return;
  return {
    resolvedFileName,
    extension: ts.Extension.Ts,
    isExternalLibraryImport: false,
  };
}
```
