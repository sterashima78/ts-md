import { describe, expect, it } from 'vitest';
import { tangle } from '../src/mini-core/tangle.ts.md';

describe('mini-core.ts.md', () => {
  it('imports across files', () => {
    expect(tangle('entry')).toBe('entry/entry');
  });
});
