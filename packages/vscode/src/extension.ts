import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from '@volar/vscode/node';
import type * as vscode from 'vscode';
import { registerCodeLens } from './codelens';
import { registerCommands } from './commands';

let client: LanguageClient;

export async function activate(ctx: vscode.ExtensionContext) {
  const serverModule = ctx.asAbsolutePath('dist/server/server.js');

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
      options: { execArgv: ['--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'ts-md' }],
    progressOnInitialization: true,
  };

  client = new LanguageClient(
    'ts-md-ls',
    'TS-MD Language Server',
    serverOptions,
    clientOptions,
  );
  await client.start();
  ctx.subscriptions.push({ dispose: () => client.stop() });

  registerCodeLens(ctx);
  registerCommands(ctx, client);
}

export function deactivate() {
  return client?.stop();
}
