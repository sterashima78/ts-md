import { describe, expect, it } from 'vitest';
import { parseChunkInfos, parseChunks } from '../src/parser.ts.md';

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

describe('parseChunkInfos', () => {
  const dict = parseChunkInfos(md, '/doc.ts.md');
  it('includes start and end offsets', () => {
    expect(dict.foo.start).toBeLessThan(dict.foo.end);
    expect(dict.foo.code).toContain('console.log(3)');
    expect(dict['path/to/bar.ts'].code).toContain('console.log(2)');
  });
});
