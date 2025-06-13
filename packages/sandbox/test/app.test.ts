import { greet } from '#../src/app.ts.md:greet';
import { describe, expect, it } from 'vitest';

describe('app.ts.md', () => {
  it('greet 関数を実行できる', () => {
    expect(greet('Vitest')).toBe('Hello, Vitest!');
  });
});
