import { describe, expect, it } from 'vitest';
import { detectCycle } from '../src/graph';
import { resolveImport } from '../src/resolver';

describe('detectCycle', () => {
  it('detects no cycle', () => {
    const dicts = new Map<string, Record<string, string>>();
    dicts.set('/a.ts.md', { main: "import './b.ts.md:dep'" });
    dicts.set('/b.ts.md', { dep: 'export const x = 1' });
    const res = detectCycle('/a.ts.md:main', (f) => dicts.get(f));
    expect(res).toBeNull();
  });

  it('detects self cycle', () => {
    const dicts = new Map<string, Record<string, string>>();
    dicts.set('/a.ts.md', { main: "import './a.ts.md:main'" });
    const res = detectCycle('/a.ts.md:main', (f) => dicts.get(f));
    expect(res).toEqual(['/a.ts.md:main', '/a.ts.md:main']);
  });
});
