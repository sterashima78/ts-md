const vscode = require('vscode');

async function waitForDiagnostics(uri, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (vscode.languages.getDiagnostics(uri).length) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('diagnostics timeout');
}

exports.run = async () => {
  const [ws] = vscode.workspace.workspaceFolders || [];
  if (!ws) throw new Error('no workspace');
  const bad = vscode.Uri.joinPath(ws.uri, 'bad.ts.md');
  const doc = await vscode.workspace.openTextDocument(bad);
  await vscode.window.showTextDocument(doc);
  console.log('languageId', doc.languageId);
  await waitForDiagnostics(doc.uri);
  const diags = vscode.languages.getDiagnostics(doc.uri);
  const has = diags.some((d) => /Argument of type/.test(d.message));
  if (!has) throw new Error('expected diagnostics');
};
