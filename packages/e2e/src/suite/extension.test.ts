import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as vscode from 'vscode';

let badDoc: vscode.TextDocument;
let completionDoc: vscode.TextDocument;

beforeAll(async () => {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) throw new Error('no workspace');

  badDoc = await vscode.workspace.openTextDocument(
    vscode.Uri.joinPath(ws.uri, 'bad.ts.md'),
  );
  await vscode.window.showTextDocument(badDoc);

  completionDoc = await vscode.workspace.openTextDocument(
    vscode.Uri.joinPath(ws.uri, 'completion.ts.md'),
  );
  await vscode.window.showTextDocument(completionDoc);
});

afterAll(async () => {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
});

describe('TS-MD language features', () => {
  it('shows type error in bad.ts.md', async () => {
    await waitForDiagnostics(badDoc.uri);
    const diags = vscode.languages.getDiagnostics(badDoc.uri);
    const has = diags.some((d) => /Argument of type/.test(d.message));
    expect(has).toBe(true);
  });

  it('provides TypeScript property completion inside a code chunk', async () => {
    const completion = await waitForCompletion(
      completionDoc.uri,
      new vscode.Position(4, 5),
    );
    expect(completion.items.some((item) => item.label === 'name')).toBe(true);
    expect(completion.items.some((item) => item.label === 'age')).toBe(true);
  });

  it('provides TypeScript hover information inside a code chunk', async () => {
    const hovers = await waitForHover(
      completionDoc.uri,
      new vscode.Position(3, 7),
    );
    expect(hovers.length).toBeGreaterThan(0);
  });
});

async function waitForDiagnostics(uri: vscode.Uri, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (vscode.languages.getDiagnostics(uri).length) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('diagnostics timeout');
}

async function waitForCompletion(
  uri: vscode.Uri,
  position: vscode.Position,
  timeout = 20000,
): Promise<vscode.CompletionList> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const result = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      uri,
      position,
    );
    if (result?.items.length) return result;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('completion timeout');
}

async function waitForHover(
  uri: vscode.Uri,
  position: vscode.Position,
  timeout = 20000,
): Promise<vscode.Hover[]> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const result = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      uri,
      position,
    );
    if (result?.length) return result;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('hover timeout');
}
