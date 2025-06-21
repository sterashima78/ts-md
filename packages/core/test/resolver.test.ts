import { describe, expect, it } from 'vitest';
import { resolveImport } from '../src/resolver.ts.md';

describe('resolveImport', () => {
  it('resolves relative path', () => {
    const res = resolveImport('./foo.ts.md', '/a/b/main.ts.md');
    expect(res).toEqual({ absPath: '/a/b/foo.ts.md', chunk: 'main' });
  });
  it('resolves parent dir', () => {
    const res = resolveImport('../foo.ts.md', '/a/b/c/app.ts.md');
    expect(res).toEqual({ absPath: '/a/b/foo.ts.md', chunk: 'main' });
  });
  it('resolves chunk in same file', () => {
    const res = resolveImport('./doc.ts.md:qux', '/a/b/doc.ts.md');
    expect(res).toEqual({ absPath: '/a/b/doc.ts.md', chunk: 'qux' });
  });
  it('resolves shorthand same-file import', () => {
    const res = resolveImport(':qux', '/a/b/doc.ts.md');
    expect(res).toEqual({ absPath: '/a/b/doc.ts.md', chunk: 'qux' });
  });
});
