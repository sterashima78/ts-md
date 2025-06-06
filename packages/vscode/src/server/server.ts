import { createTsMdPlugin } from '@sterashima78/ts-md-ls-core';
import type { LanguagePlugin } from '@volar/language-core';
import { createSimpleProject } from '@volar/language-server/lib/project/simpleProject';
import { createConnection, createServer } from '@volar/language-server/node';
import type { URI } from 'vscode-uri';

const connection = createConnection();
const server = createServer(connection);
const plugin = createTsMdPlugin as unknown as LanguagePlugin<URI>;

connection.listen();
connection.onInitialize((params) =>
  server.initialize(params, createSimpleProject([plugin]), []),
);
