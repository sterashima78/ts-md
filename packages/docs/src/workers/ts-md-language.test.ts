import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parseTsMdModules } from './ts-md-language';
import {
  defaultTypeScriptLibraryFileName,
  defaultTypeScriptLibrarySource,
} from './typescript-libs';

describe('Monaco playground parser', () => {
  it('Markdown の例示用フェンス内にある TypeScript フェンスを無視する', () => {
    const markdown = [
      '````markdown',
      '```ts main',
      'export const example = true;',
      '```',
      '````',
      '',
      '```ts main',
      'export const actual = 1;',
      '```',
    ].join('\n');

    expect(parseTsMdModules(markdown, '/demo.ts.md')).toEqual([
      expect.objectContaining({
        name: 'main',
        language: 'ts',
        code: 'export const actual = 1;',
      }),
    ]);
  });
});

describe('Monaco playground TypeScript libraries', () => {
  it('ES2022 と DOM の標準 API を型検査できる', () => {
    const fileName = '/playground.ts';
    const source = [
      'const values = [1, 2, 3].map((value) => value * 2);',
      "document.querySelector('body');",
      'console.log(await Promise.resolve(values));',
    ].join('\n');
    const files = new Map([
      [fileName, source],
      [defaultTypeScriptLibraryFileName, defaultTypeScriptLibrarySource],
    ]);
    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => ({
        module: ts.ModuleKind.ESNext,
        strict: true,
        target: ts.ScriptTarget.ES2022,
      }),
      getCurrentDirectory: () => '/',
      getDefaultLibFileName: () => defaultTypeScriptLibraryFileName,
      getScriptFileNames: () => [fileName],
      getScriptSnapshot: (requestedFileName) => {
        const content = files.get(requestedFileName);
        return content === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(content);
      },
      getScriptVersion: () => '0',
      fileExists: (requestedFileName) => files.has(requestedFileName),
      readFile: (requestedFileName) => files.get(requestedFileName),
      readDirectory: () => [],
    };
    const service = ts.createLanguageService(host);

    const diagnostics = service.getProgram()?.getSemanticDiagnostics() ?? [];
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([]);
  });
});
