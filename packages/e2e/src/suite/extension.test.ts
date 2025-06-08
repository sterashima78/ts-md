import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as vscode from 'vscode';

let doc: vscode.TextDocument;

beforeAll(async () => {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) throw new Error('no workspace');
  const bad = vscode.Uri.joinPath(ws.uri, 'bad.ts.md');
  doc = await vscode.workspace.openTextDocument(bad);
  await vscode.window.showTextDocument(doc);
});

afterAll(async () => {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
});

describe('TS-MD diagnostics', () => {
  it('shows type error in bad.ts.md', async () => {
    await waitForDiagnostics(doc.uri);
    const diags = vscode.languages.getDiagnostics(doc.uri);
    const has = diags.some((d) => /Argument of type/.test(d.message));
    expect(has).toBe(true);
  });
});

async function waitForDiagnostics(uri: vscode.Uri, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (vscode.languages.getDiagnostics(uri).length) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('diagnostics timeout');
}
