import { tangle } from '#../src/mini-core/tangle.ts.md:tangle';
import { describe, expect, it } from 'vitest';

describe('mini-core.ts.md', () => {
  it('imports across files', () => {
    expect(tangle('entry')).toBe('entry/entry');
  });
});
