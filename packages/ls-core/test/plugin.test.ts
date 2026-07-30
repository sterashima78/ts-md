import path from 'node:path';
import {
  createVirtualModuleFileName,
  parseVirtualModuleFileName,
} from '@sterashima78/ts-md-core';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import {
  createTsMdPlugin,
  resolveTsMdFileName,
} from '../src/index.ts';
import type { TsMdVirtualFile } from '../src/virtual-file.ts.md';

function fence(header: string, code: string) {
  return ['```' + header, code, '```'].join('\n');
}

describe('ts-md language plugin', () => {
  it('accepts URI objects', () => {
    expect(createTsMdPlugin.getLanguageId(URI.file('/x.ts.md'))).toBe('ts-md');
  });

  it('maps each code fence to one TypeScript virtual module', () => {
    const code = 'const value = { name: "ts-md" };';
    const markdown = fence('ts main', code);
    const virtualFile = createTsMdPlugin.createVirtualCode?.(
      URI.file('/test.ts.md'),
      'ts-md',
      ts.ScriptSnapshot.fromString(markdown),
      { getAssociatedScript: () => undefined },
    );
    const main = virtualFile?.embeddedCodes[0];

    expect(main?.id).toBe(
      createVirtualModuleFileName({
        documentPath: '/test.ts.md',
        moduleName: 'main',
      }),
    );
    expect(main?.mappings).toEqual([
      expect.objectContaining({
        sourceOffsets: [markdown.indexOf(code)],
        generatedOffsets: [0],
        lengths: [code.length],
      }),
    ]);
  });

  it('preserves module names without delimiter parsing', () => {
    const markdown = [
      fence('ts foo__bar', 'export const value = 1;'),
      fence('ts main', "import { value } from ':foo__bar';"),
    ].join('\n\n');
    const virtualFile = createTsMdPlugin.createVirtualCode?.(
      '/test.ts.md',
      'ts-md',
      ts.ScriptSnapshot.fromString(markdown),
      { getAssociatedScript: () => undefined },
    ) as TsMdVirtualFile;
    const scripts = createTsMdPlugin.typescript?.getExtraServiceScripts?.(
      '/test.ts.md',
      virtualFile,
    );

    expect(
      scripts?.map((script) =>
        parseVirtualModuleFileName(script.fileName)?.moduleName,
      ),
    ).toContain('foo__bar');
  });

  it('resolves supported module specifiers only', () => {
    expect(resolveTsMdFileName(':foo', '/test.ts.md')).toBe(
      createVirtualModuleFileName({
        documentPath: '/test.ts.md',
        moduleName: 'foo',
      }),
    );
    expect(resolveTsMdFileName('./dep.ts.md', '/test.ts.md')).toBe(
      path.resolve('/dep.ts.md'),
    );
    expect(resolveTsMdFileName('#foo', '/test.ts.md')).toBeUndefined();
  });
});
