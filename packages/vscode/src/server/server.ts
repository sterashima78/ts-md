import { collectDiagnostics } from '@sterashima78/ts-md-ls-core';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  DiagnosticSeverity,
  type InitializeParams,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams) => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
  },
}));

documents.onDidOpen((e: { document: TextDocument }) =>
  sendDiagnostics(e.document),
);
documents.onDidChangeContent((e: { document: TextDocument }) =>
  sendDiagnostics(e.document),
);

async function sendDiagnostics(doc: TextDocument) {
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

documents.listen(connection);
connection.listen();
