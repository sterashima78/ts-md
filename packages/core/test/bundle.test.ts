import { describe, expect, it } from 'vitest';
import { bundleMarkdown } from '../src/bundle.ts.md';

const md = [
  '# Test',
  '',
  '```ts main',
  "import { msg } from ':foo'",
  'console.log(msg)',
  '```',
  '',
  '```ts foo',
  "export const msg = 'hi'",
  '```',
].join('\n');

describe('bundleMarkdown', () => {
  const code = bundleMarkdown(md, '/doc.ts.md');
  it('bundles chunks with prefix', () => {
    expect(code).toContain('const foo_msg');
    expect(code).toContain('console.log(foo_msg)');
    expect(code).not.toContain('export { foo_msg as msg }');
  });
});
