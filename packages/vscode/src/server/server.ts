import { collectDiagnostics } from '@sterashima78/ts-md-ls-core';
import { provider as fileSystemProvider } from '@volar/language-server/lib/fileSystemProviders/node';
import { createSimpleProject } from '@volar/language-server/lib/project/simpleProject';
import { createServerBase } from '@volar/language-server/lib/server';
import type { SnapshotDocument } from '@volar/language-server/lib/utils/snapshotDocument';
import {
  DiagnosticSeverity,
  type ExperimentalFeatures,
  type ServerCapabilities,
  TextDocumentSyncKind,
  createConnection,
} from '@volar/language-server/node';
import { URI } from 'vscode-uri';

const connection = createConnection();
const server = createServerBase(connection, { timer: { setImmediate } });
server.fileSystem.install('file', fileSystemProvider);
const { documents } = server;

server.onInitialize(
  (serverCapabilities: ServerCapabilities<ExperimentalFeatures>) => {
    serverCapabilities.textDocumentSync = TextDocumentSyncKind.Incremental;
  },
);

connection.onInitialize((params) =>
  server.initialize(params, createSimpleProject([]), []),
);
connection.onInitialized(() => server.initialized());
connection.onShutdown(() => server.shutdown());

documents.onDidOpen((e) => void sendDiagnostics(e.document));
documents.onDidChangeContent((e) => void sendDiagnostics(e.document));

async function sendDiagnostics(doc: SnapshotDocument) {
  const file = URI.parse(doc.uri).fsPath;
  const result = await collectDiagnostics([file]);
  const diagnostics = (result[file] ?? []).map((d) => ({
    range: d.range,
    message: d.message,
    severity: DiagnosticSeverity.Error,
    source: 'ts-md',
  }));
  connection.sendDiagnostics({ uri: doc.uri, diagnostics });
}

connection.listen();
