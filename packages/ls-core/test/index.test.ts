import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LanguagePlugin } from '@volar/language-core';
import {
  type Language,
  type SourceScript,
  createLanguage,
  createLanguageService,
} from '@volar/language-service';
import ts from 'typescript';
import { URI } from 'vscode-uri';
import { type TsMdVirtualFile, createTsMdPlugin } from '../src';

describe('ts-md-ls-core diagnostics', () => {
  const dir = path.join(__dirname, 'fixtures');
  const aPath = path.join(dir, 'a.ts.md');
  const mainPath = path.join(dir, 'main.ts.md');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      aPath,
      ['# A', '', '```ts foo', "export const msg: number = 'hi'", '```'].join(
        '\n',
      ),
    );
    fs.writeFileSync(
      mainPath,
      [
        '# Main',
        '',
        '```ts main',
        "import '#./a.ts.md:foo'",
        "import { msg } from '#./a.ts.md:foo'",
        'console.log(msg)',
        '```',
      ].join('\n'),
    );
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports diagnostics across docs', async () => {
    const scripts = new Map<URI, SourceScript<URI>>();
    const plugin = createTsMdPlugin as unknown as LanguagePlugin<
      URI,
      TsMdVirtualFile
    >;
    // biome-ignore lint/suspicious/noExplicitAny lint/style/useConst: test helper
    let language!: Language<URI>;
    language = createLanguage<URI>([plugin], scripts, (id) => {
      if (scripts.has(id)) return;
      const filePath = id.fsPath;
      const snapshot = ts.ScriptSnapshot.fromString(
        fs.readFileSync(filePath, 'utf8'),
      );
      language.scripts.set(id, snapshot, 'ts-md');
    });
    const ls = createLanguageService(
      language,
      [],
      { workspaceFolders: [] },
      {},
    );
    const uri = URI.file(mainPath);
    language.scripts.get(uri);
    const diags = await ls.getDiagnostics(uri);
    expect(diags.length).toBe(1);
  });
});
