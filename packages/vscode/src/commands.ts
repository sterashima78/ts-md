import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import type { LanguageClient } from 'vscode-languageclient/node';
const exec = promisify(execFile);

export function registerCommands(
  ctx: vscode.ExtensionContext,
  _client: LanguageClient,
) {
  const bin = require.resolve('@sterashima78/ts-md-cli/dist/index.js');

  async function runCli(args: string[]) {
    const { stdout, stderr } = await exec(process.execPath, [bin, ...args]);
    vscode.window.showInformationMessage(stdout || stderr);
  }

  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      'tsmd.runTest',
      (uri: vscode.Uri, chunk: string) =>
        runCli(['run', `${uri.fsPath}:${chunk}`]),
    ),
    vscode.commands.registerCommand(
      'tsmd.runChunk',
      (uri: vscode.Uri, chunk: string) =>
        runCli(['run', `${uri.fsPath}:${chunk}`]),
    ),
    vscode.commands.registerCommand('tsmd.tangle', async () =>
      runCli([
        'tangle',
        vscode.window.activeTextEditor?.document.uri.fsPath ?? '',
      ]),
    ),
  );
}
