import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import { provider as fileSystemProvider } from '@volar/language-server/lib/fileSystemProviders/node';
import { createTypeScriptProject } from '@volar/language-server/lib/project/typescriptProject';
import { createServerBase } from '@volar/language-server/lib/server';
import {
  createConnection,
  type ExperimentalFeatures,
  type ServerCapabilities,
  TextDocumentSyncKind,
} from '@volar/language-server/node';
import type { LanguagePlugin } from '@volar/language-service';
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
      languagePlugins: [createTsMdPlugin as unknown as LanguagePlugin<URI>],
    })),
    createTypeScriptServicePlugins(ts),
  ),
);
connection.onInitialized(() => server.initialized());
connection.onShutdown(() => server.shutdown());

connection.listen();
