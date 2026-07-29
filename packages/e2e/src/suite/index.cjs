const vscode = require('vscode');

async function waitForDiagnostics(uri, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    if (diagnostics.length) return diagnostics;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('diagnostics timeout');
}

async function waitForCompletion(uri, position, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const completion = await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider',
      uri,
      position,
    );
    if (completion?.items?.length) return completion;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('completion timeout');
}

async function waitForHover(uri, position, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const hovers = await vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      uri,
      position,
    );
    if (hovers?.length) return hovers;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('hover timeout');
}

exports.run = async () => {
  const [workspace] = vscode.workspace.workspaceFolders || [];
  if (!workspace) throw new Error('no workspace');

  const badUri = vscode.Uri.joinPath(workspace.uri, 'bad.ts.md');
  const badDocument = await vscode.workspace.openTextDocument(badUri);
  await vscode.window.showTextDocument(badDocument);
  console.log('languageId', badDocument.languageId);

  const diagnostics = await waitForDiagnostics(badDocument.uri);
  if (!diagnostics.some((diagnostic) => /Argument of type/.test(diagnostic.message))) {
    throw new Error('expected TypeScript diagnostics');
  }

  const completionUri = vscode.Uri.joinPath(workspace.uri, 'completion.ts.md');
  const completionDocument = await vscode.workspace.openTextDocument(completionUri);
  await vscode.window.showTextDocument(completionDocument);

  const completion = await waitForCompletion(
    completionDocument.uri,
    new vscode.Position(4, 5),
  );
  const labels = new Set(completion.items.map((item) => String(item.label)));
  if (!labels.has('name') || !labels.has('age')) {
    throw new Error('expected TypeScript property completion');
  }

  const hovers = await waitForHover(
    completionDocument.uri,
    new vscode.Position(3, 7),
  );
  if (!hovers.length) {
    throw new Error('expected TypeScript hover information');
  }
};
