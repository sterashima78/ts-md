import { describe, expect, it } from 'vitest';
import { parseChunks } from '../src/parser';

const md = [
  '# Title',
  '',
  '```ts foo',
  'console.log(1)',
  '```',
  '',
  '<!-- file: path/to/bar.ts -->',
  '```ts bar',
  'console.log(2)',
  '```',
  '',
  '```ts foo',
  'console.log(3)',
  '```',
].join('\n');

describe('parseChunks', () => {
  const dict = parseChunks(md, '/doc.ts.md');
  it('extracts named chunks', () => {
    expect(Object.keys(dict)).toEqual(['foo', 'path/to/bar.ts']);
    expect(dict.foo.trim().split('\n').length).toBe(2);
  });
});
