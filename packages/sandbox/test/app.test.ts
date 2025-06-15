import { describe, expect, it } from 'vitest';
import { greet } from '../src/app.ts.md:greet';

describe('app.ts.md', () => {
  it('greet 関数を実行できる', () => {
    expect(greet('Vitest')).toBe('Hello, Vitest!');
  });
});
