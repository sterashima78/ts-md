import * as vscode from 'vscode';

export function registerCodeLens(ctx: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: 'ts-md' };
  ctx.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, new Provider()),
  );
}

class Provider implements vscode.CodeLensProvider {
  provideCodeLenses(doc: vscode.TextDocument) {
    const out: vscode.CodeLens[] = [];
    for (let i = 0; i < doc.lineCount; i++) {
      const m = doc.lineAt(i).text.match(/^```ts(?:x?)\s+(\S+)/);
      if (!m) continue;
      const name = m[1];
      const pos = new vscode.Position(i, 0);
      const isTest = /(test|spec)$/.test(name);
      out.push(
        new vscode.CodeLens(new vscode.Range(pos, pos), {
          title: isTest ? '▶ Run Test' : '▶ Run Chunk',
          command: isTest ? 'tsmd.runTest' : 'tsmd.runChunk',
          arguments: [doc.uri, name],
        }),
      );
    }
    return out;
  }
}
