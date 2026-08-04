import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVirtualModuleFileName, resolveImport } from '../src/index.ts';

describe('resolveImport', () => {
  it('別 document の import を main module として解決する', () => {
    expect(resolveImport('./foo.ts.md', '/a/b/main.ts.md')).toEqual({
      absPath: path.resolve('/a/b/foo.ts.md'),
      chunk: 'main',
    });
  });

  it('同じ document の名前付き module を解決する', () => {
    expect(resolveImport(':qux', '/a/b/doc.ts.md')).toEqual({
      absPath: path.resolve('/a/b/doc.ts.md'),
      chunk: 'qux',
    });
  });

  it('仮想 module の import 元を元 document に戻す', () => {
    const importer = createVirtualModuleFileName({
      documentPath: '/a/b/doc.ts.md',
      moduleName: 'main',
    });
    expect(resolveImport(':qux', importer)).toEqual({
      absPath: path.resolve('/a/b/doc.ts.md'),
      chunk: 'qux',
    });
  });

  it('別 document の module suffix を解決しない', () => {
    expect(
      resolveImport('../foo.ts.md:qux', '/a/b/c/app.ts.md'),
    ).toBeUndefined();
    expect(
      resolveImport('../foo.ts.md:main', '/a/b/c/app.ts.md'),
    ).toBeUndefined();
  });

  it('旧 hash shorthand を解決しない', () => {
    expect(resolveImport('#qux', '/a/b/doc.ts.md')).toBeUndefined();
  });
});
