import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectModuleSpecifiers,
  createVirtualModuleFileName,
  detectCycle,
  parseChunkInfos,
  parseChunks,
  parseDocument,
  parseVirtualModuleFileName,
  tangle,
} from '../src/index.ts';

function fence(header: string, code: string) {
  return ['```' + header, code, '```'].join('\n');
}

describe('document module model', () => {
  it('treats each code fence as one module and preserves language', () => {
    const markdown = [
      fence('ts values', 'export const value = 1'),
      fence('tsx view', 'export const view = <div />'),
    ].join('\n\n');

    expect(parseDocument(markdown, '/doc.ts.md').modules).toEqual([
      expect.objectContaining({
        name: 'values',
        language: 'ts',
        code: 'export const value = 1',
      }),
      expect.objectContaining({
        name: 'view',
        language: 'tsx',
        code: 'export const view = <div />',
      }),
    ]);
  });

  it('rejects duplicate and unnamed modules', () => {
    expect(() =>
      parseDocument(
        [
          fence('ts values', 'export const first = 1'),
          fence('ts values', 'export const second = 2'),
        ].join('\n\n'),
        '/doc.ts.md',
      ),
    ).toThrow("Duplicate module 'values'");
    expect(() =>
      parseDocument(fence('ts', 'const value = 1'), '/doc.ts.md'),
    ).toThrow('TypeScript code fence requires a module name');
  });

  it('provides code and source range compatibility views', () => {
    const code = 'console.log(1)';
    const markdown = fence('ts main', code);
    expect(parseChunks(markdown, '/doc.ts.md')).toEqual({ main: code });
    const info = parseChunkInfos(markdown, '/doc.ts.md').main;
    expect(info.start).toBe(markdown.indexOf(code));
    expect(info.end).toBe(info.start + code.length);
  });
});

describe('virtual module IDs', () => {
  it('round-trips names without changing the resolution directory', () => {
    const id = {
      documentPath: path.resolve('/workspace/doc.ts.md'),
      moduleName: 'foo__bar',
    };
    const fileName = createVirtualModuleFileName(id);
    expect(path.dirname(fileName)).toBe(path.dirname(id.documentPath));
    expect(parseVirtualModuleFileName(fileName)).toEqual(id);
  });
});

describe('module graph', () => {
  it('collects imports, re-exports, and dynamic imports from the AST', () => {
    expect(
      collectModuleSpecifiers([
        "import { a } from ':a'",
        "export { b } from ':b'",
        "void import(':c')",
      ].join('\n')),
    ).toEqual([':a', ':b', ':c']);
  });

  it('detects cycles between modules', () => {
    const documents = new Map<string, Record<string, string>>();
    documents.set('/a.ts.md', {
      main: "import { value } from ':dep'",
      dep: "import ':main'; export const value = 1",
    });
    expect(detectCycle('/a.ts.md:main', (file) => documents.get(file))).toEqual([
      '/a.ts.md:main',
      '/a.ts.md:dep',
      '/a.ts.md:main',
    ]);
  });
});

describe('tangle', () => {
  it('writes one TypeScript file for each module', async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'ts-md-tangle-'));
    const document = parseDocument(
      [
        fence('ts main', 'export const value = 1'),
        fence('tsx view', 'export const view = <div />'),
      ].join('\n\n'),
      '/doc.ts.md',
    );

    await tangle(document, output);

    expect(await fs.readFile(path.join(output, 'doc', 'main.ts'), 'utf8')).toBe(
      'export const value = 1',
    );
    expect(await fs.readFile(path.join(output, 'doc', 'view.tsx'), 'utf8')).toBe(
      'export const view = <div />',
    );
    await fs.rm(output, { recursive: true, force: true });
  });
});
