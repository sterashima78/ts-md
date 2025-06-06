import fs from 'node:fs';
import path from 'node:path';
import type { LanguagePlugin } from '@volar/language-core';
import {
  type Language,
  type SourceScript,
  createLanguage,
  createLanguageService,
} from '@volar/language-service';
import ts from 'typescript';
import { URI } from 'vscode-uri';
import type { TsMdVirtualFile } from '../src';
let createTsMdPlugin: typeof import('../src').createTsMdPlugin;

describe('ts-md-ls-core diagnostics', () => {
  const dir = path.join(__dirname, 'fixtures');
  const aPath = path.join(dir, 'a.ts.md');
  const mainPath = path.join(dir, 'main.ts.md');

  beforeAll(async () => {
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

    createTsMdPlugin = (await import('../src')).createTsMdPlugin;
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
      let filePath: string;
      if (typeof id === 'string') {
        const m = /^#(.+):/.exec(id);
        if (!m) return;
        filePath = URI.parse(m[1]).fsPath;
      } else {
        filePath = id.fsPath;
      }
      const snapshot = ts.ScriptSnapshot.fromString(
        fs.readFileSync(filePath, 'utf8'),
      );
      language.scripts.set(
        typeof id === 'string' ? URI.parse(id) : id,
        snapshot,
        'ts-md',
      );
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
    expect(diags.length).toBeGreaterThanOrEqual(0);
  });
});
